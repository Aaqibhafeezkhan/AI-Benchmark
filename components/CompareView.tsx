"use client"

import { useReducer, useRef, useCallback, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PromptInput } from "./PromptInput"
import { BenchmarkLibrary } from "./BenchmarkLibrary"
import { ModelPane } from "./ModelPane"
import { Scorecard } from "./Scorecard"
import { WinnerBar } from "./WinnerBar"
import { streamResponse, Personality } from "@/lib/mock-engine"
import { readSSEStream } from "@/lib/stream-parser"
import { providerErrorMessage, providerNetworkErrorMessage } from "@/lib/provider-errors"
import { determineWinner, emptyScore } from "@/lib/scoring"
import { BENCHMARK_PROMPTS, LATEST_BENCHMARKS } from "@/lib/benchmarks"
import { HF_MODELS, MOCK_MODELS, RETIRED_MODELS, DEFAULT_PAIR, getModelEngine, getHFModelId } from "@/lib/models"
import { fetchHuggingFaceModelCatalog } from "@/lib/hf-catalog"
import {
  CompareState,
  CompareAction,
  ModelConfig,
  ScoreEntry,
} from "@/lib/types"


type HeuristicMetrics = {
  promptTermCoverage: number
  responseWords: number
  sentenceCount: number
  structureSignal: boolean | null
  label: string
}

type StoredBenchmarkRun = {
  id: string
  createdAt: string
  prompt: string
  selectedModels: [string, string]
  responses: Record<string, string>
  scores: Record<string, ScoreEntry>
  metrics: Record<string, HeuristicMetrics>
  status: "completed" | "partial" | "failed" | "cancelled"
  durationMs: number
  winner: string | "tie" | null
}

const RUN_HISTORY_KEY = "ai-benchmark:run-history:v1"
const MAX_SAVED_RUNS = 30

function calculateHeuristicMetrics(prompt: string, response: string): HeuristicMetrics {
  const words = (value: string) => (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((word) => word.length > 2)
  const promptWords = [...new Set(words(prompt))]
  const responseWords = new Set(words(response))
  const matched = promptWords.filter((word) => responseWords.has(word)).length
  const asksForStructure = /\b(list|bullet|numbered|steps?|exactly \d+|table|format)\b/i.test(prompt)
  const hasStructure = /(^|\n)\s*(?:\d+[.)]|[-*•])\s+/m.test(response)
  return {
    promptTermCoverage: promptWords.length ? Math.round((matched / promptWords.length) * 100) : 0,
    responseWords: words(response).length,
    sentenceCount: (response.match(/[.!?]+(?:\s|$)/g) || []).length,
    structureSignal: asksForStructure ? hasStructure : null,
    label: "Heuristic signals only; not a correctness or quality score",
  }
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return ""
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
  }
  return [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\r\n")
}

function loadRunHistory(): StoredBenchmarkRun[] {
  if (typeof window === "undefined") return []
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RUN_HISTORY_KEY) || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is StoredBenchmarkRun =>
      Boolean(item && typeof item.id === "string" && typeof item.prompt === "string" &&
        item.responses && typeof item.responses === "object" && Array.isArray(item.selectedModels))
    ).slice(0, MAX_SAVED_RUNS)
  } catch {
    return []
  }
}

function saveRunHistory(run: StoredBenchmarkRun): StoredBenchmarkRun[] {
  const next = [run, ...loadRunHistory().filter((item) => item.id !== run.id)].slice(0, MAX_SAVED_RUNS)
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(next))
    } catch {
      return next
    }
  }
  return next
}

function updateRunHistory(run: StoredBenchmarkRun): StoredBenchmarkRun[] {
  return saveRunHistory(run)
}

async function* streamHuggingFaceResponse(
  prompt: string,
  modelId: string,
  token: string,
  signal: AbortSignal
): AsyncGenerator<string> {
  let response: Response
  try {
    response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        model: getHFModelId(modelId) + ":fastest",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 1024,
      }),
      signal,
    })
  } catch {
    if (signal.aborted) return
    throw new Error(providerNetworkErrorMessage())
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "")
    throw new Error(providerErrorMessage(response.status, responseBody))
  }
  if (!response.body) throw new Error("Hugging Face returned no response stream.")

  let receivedContent = false
  for await (const event of readSSEStream(response.body, signal)) {
    if (event.done) return
    if (event.content !== undefined && event.content.length > 0) {
      receivedContent = true
      yield event.content
    }
  }
  if (!receivedContent && !signal.aborted) {
    throw new Error("The selected model returned no generated text.")
  }
}

async function* streamProviderResponse(
  prompt: string,
  modelId: string,
  token: string,
  parentSignal: AbortSignal
): AsyncGenerator<string> {
  const controller = new AbortController()
  const abortFromParent = () => controller.abort()
  if (parentSignal.aborted) controller.abort()
  else parentSignal.addEventListener("abort", abortFromParent, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), 120000)

  try {
    const stream = streamHuggingFaceResponse(prompt, modelId, token, controller.signal)
    for await (const chunk of stream) {
      if (parentSignal.aborted) return
      yield chunk
    }
    if (controller.signal.aborted && !parentSignal.aborted) {
      throw new Error("Provider request timed out after 120 seconds.")
    }
  } catch (error) {
    if (parentSignal.aborted) return
    if (controller.signal.aborted) throw new Error("Provider request timed out after 120 seconds.")
    throw error instanceof Error ? error : new Error("Provider request failed unexpectedly.")
  } finally {
    window.clearTimeout(timeout)
    parentSignal.removeEventListener("abort", abortFromParent)
  }
}

function compareReducer(state: CompareState, action: CompareAction): CompareState {
  switch (action.type) {
    case "SET_PROMPT":
      return { ...state, prompt: action.payload }
    case "SET_MODEL":
      const newSelected = [...state.selectedModels] as [string, string]
      newSelected[action.payload.slot] = action.payload.modelId
      return { ...state, selectedModels: newSelected }
    case "START_STREAM":
      return {
        ...state,
        responses: { ...state.responses, [action.payload.modelId]: "" },
        streaming: { ...state.streaming, [action.payload.modelId]: true },
      }
    case "APPEND_CHUNK":
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.payload.modelId]:
            state.responses[action.payload.modelId] + action.payload.chunk,
        },
      }
    case "END_STREAM":
      return {
        ...state,
        streaming: { ...state.streaming, [action.payload.modelId]: false },
      }
    case "SET_SCORE":
      return {
        ...state,
        scores: {
          ...state.scores,
          [action.payload.modelId]: {
            ...state.scores[action.payload.modelId],
            [action.payload.field]: action.payload.value,
          },
        },
      }
    case "RESET_RESPONSES":
      return {
        ...state,
        responses: {},
        scores: {},
        streaming: {},
      }
    case "RESTORE_RUN":
      return {
        ...state,
        prompt: action.payload.prompt,
        selectedModels: action.payload.selectedModels,
        responses: action.payload.responses,
        scores: action.payload.scores,
        streaming: {},
      }
    default:
      return state
  }
}

const initialState: CompareState = {
  prompt: BENCHMARK_PROMPTS[0]?.prompt ?? "",
  selectedModels: DEFAULT_PAIR,
  responses: {},
  scores: {},
  streaming: {},
}

function downloadFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function getExportData(state: CompareState, models: ModelConfig[]) {
  const modelResults = models.map((model) => ({
    model: model.label,
    modelId: model.id,
    response: state.responses[model.id] ?? "",
    score: state.scores[model.id] ?? null,
    heuristicMetrics: calculateHeuristicMetrics(state.prompt, state.responses[model.id] ?? ""),
  }))
  const winnerId = determineWinner(models.map((model) => model.id), state.scores)
  const winner = winnerId === "tie" ? "Draw" : models.find((model) => model.id === winnerId)?.label ?? null
  return {
    exportedAt: new Date().toISOString(),
    prompt: state.prompt,
    models: modelResults,
    winner,
    scoringNote: "Manual scores are subjective; heuristic metrics are signals only and do not measure correctness.",
  }
}

function toMarkdown(data: ReturnType<typeof getExportData>) {
  const sections = data.models.map((model) => {
    const completeScore = model.score && ["accuracy", "tone", "speed"].every((field) => Number.isFinite(model.score?.[field as keyof ScoreEntry]))
    const score = completeScore
      ? `Accuracy: ${model.score?.accuracy}, Tone: ${model.score?.tone}, Speed: ${model.score?.speed}`
      : model.score ? "Partially scored" : "Not scored"
    return `## ${model.model}\n\n**Scores:** ${score}\n\n**Response:**\n\n${model.response || "No response"}`
  })

  return `# AI Benchmark Run\n\n**Exported:** ${data.exportedAt}\n\n**Winner:** ${data.winner ?? "Not scored"}\n\n## Prompt\n\n${data.prompt}\n\n${sections.join("\n\n")}`
}

export function CompareView() {
  const [state, dispatch] = useReducer(compareReducer, initialState)
  const abortControllersRef = useRef<Record<string, AbortController>>({})
  const [hfToken, setHfToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<StoredBenchmarkRun[]>([])
  const [catalogModels, setCatalogModels] = useState<ModelConfig[]>(HF_MODELS)
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "live" | "curated">("loading")
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState<string | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [isRefreshingModels, setIsRefreshingModels] = useState(false)
  const activeRunIdRef = useRef<string | null>(null)
  const runInProgressRef = useRef(false)
  const cancelRequestedRef = useRef(false)
  const mountedRef = useRef(false)
  const catalogRequestRef = useRef<AbortController | null>(null)

  const refreshModelCatalog = useCallback(async (token: string) => {
    catalogRequestRef.current?.abort()
    const controller = new AbortController()
    catalogRequestRef.current = controller
    setIsRefreshingModels(true)
    setCatalogError(null)
    try {
      const discovered = await fetchHuggingFaceModelCatalog(token, controller.signal)
      if (!mountedRef.current || controller.signal.aborted) return
      const combined = [...discovered, ...HF_MODELS.filter((fallback) => !discovered.some((model) => model.id === fallback.id))]
      setCatalogModels(combined)
      setCatalogStatus("live")
      setCatalogUpdatedAt(new Date().toISOString())
    } catch (cause) {
      if (!mountedRef.current || controller.signal.aborted) return
      setCatalogModels(HF_MODELS)
      setCatalogStatus("curated")
      setCatalogError(cause instanceof Error ? cause.message : "Model discovery is temporarily unavailable.")
    } finally {
      if (catalogRequestRef.current === controller) catalogRequestRef.current = null
      if (mountedRef.current && !controller.signal.aborted) setIsRefreshingModels(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    setHistory(loadRunHistory())
    void refreshModelCatalog("")
    return () => {
      mountedRef.current = false
      cancelRequestedRef.current = true
      Object.values(abortControllersRef.current).forEach((controller) => controller.abort())
      abortControllersRef.current = {}
      catalogRequestRef.current?.abort()
      catalogRequestRef.current = null
    }
  }, [refreshModelCatalog])

  const isStreaming = Object.values(state.streaming).some(Boolean)

  const needsHfToken = state.selectedModels.some((id) => getModelEngine(id) === "hf")
  const hasRetiredModel = state.selectedModels.some((id) => getModelEngine(id) === "github")
  const hasHistoricalModel = state.selectedModels.some((id) => getModelEngine(id) !== "hf")

  const handleCompare = useCallback(async () => {
    if (!state.prompt.trim() || isStreaming || runInProgressRef.current) return

    setError(null)

    if (state.selectedModels[0] === state.selectedModels[1]) {
      setError("Choose two different models to compare.")
      return
    }
    if (hasRetiredModel || hasHistoricalModel) {
      setError("This saved comparison uses a retired or simulated model. Choose two current Hugging Face models to start a new live comparison.")
      return
    }
    if (needsHfToken && !hfToken) {
      setError("Hugging Face token required. Get one at huggingface.co/settings/tokens with Inference Providers permission.")
      return
    }

    runInProgressRef.current = true
    cancelRequestedRef.current = false
    const startedAt = Date.now()
    const runResponses: Record<string, string> = {}
    const runFailures: Record<string, string> = {}
    dispatch({ type: "RESET_RESPONSES" })

    const modelSources = [...catalogModels, ...MOCK_MODELS, ...RETIRED_MODELS]
    const models = state.selectedModels.map((id) =>
      modelSources.find((model) => model.id === id)
    ).filter(Boolean) as ModelConfig[]
    if (models.length !== 2) {
      setError("One or more saved model IDs are no longer available in the current Hugging Face catalogue. Select two current models.")
      runInProgressRef.current = false
      return
    }

    try {
      await Promise.all(
        models.map(async (model) => {
          const controller = new AbortController()
          abortControllersRef.current[model.id] = controller
          dispatch({ type: "START_STREAM", payload: { modelId: model.id } })

          try {
            const engine = getModelEngine(model.id)
            let stream: AsyncGenerator<string>

            if (engine === "github") {
              throw new Error("GitHub Models was retired on July 30, 2026. Choose a supported model.")
            } else if (engine === "hf") {
              stream = streamProviderResponse(state.prompt, model.id, hfToken, controller.signal)
            } else {
              stream = streamResponse(state.prompt, model.personality as Personality, controller.signal)
            }

            for await (const chunk of stream) {
              if (!mountedRef.current) return
              runResponses[model.id] = (runResponses[model.id] || "") + chunk
              dispatch({
                type: "APPEND_CHUNK",
                payload: { modelId: model.id, chunk },
              })
            }
          } catch (err) {
            if (!cancelRequestedRef.current) {
              runFailures[model.id] = err instanceof Error ? err.message : "The model request failed unexpectedly."
              if (mountedRef.current) setError(runFailures[model.id])
            }
          } finally {
            if (mountedRef.current) dispatch({ type: "END_STREAM", payload: { modelId: model.id } })
            if (abortControllersRef.current[model.id] === controller) {
              delete abortControllersRef.current[model.id]
            }
          }
        })
      )

      if (!mountedRef.current) return
      const runId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "run-" + startedAt
      const selectedModels = [...state.selectedModels] as [string, string]
      const savedRun: StoredBenchmarkRun = {
        id: runId,
        createdAt: new Date(startedAt).toISOString(),
        prompt: state.prompt,
        selectedModels,
        responses: runResponses,
        scores: {},
        metrics: Object.fromEntries(models.map((model) => [model.id, calculateHeuristicMetrics(state.prompt, runResponses[model.id] || "")])),
        status: cancelRequestedRef.current ? "cancelled" : models.every((model) => Boolean(runResponses[model.id]) && !runFailures[model.id])
          ? "completed"
          : models.some((model) => Boolean(runResponses[model.id])) ? "partial" : "failed",
        durationMs: Date.now() - startedAt,
        winner: null,
      }
      activeRunIdRef.current = runId
      setHistory(saveRunHistory(savedRun))
    } finally {
      runInProgressRef.current = false
    }
  }, [state.prompt, state.selectedModels, isStreaming, hfToken, needsHfToken, hasRetiredModel, hasHistoricalModel, catalogModels])

  const handleStop = useCallback(() => {
    if (!runInProgressRef.current) return
    cancelRequestedRef.current = true
    Object.values(abortControllersRef.current).forEach((controller) => controller.abort())
  }, [])

  const handleScore = useCallback(
    (modelId: string, field: keyof ScoreEntry, value: number) => {
      dispatch({ type: "SET_SCORE", payload: { modelId, field, value } })
      const activeRunId = activeRunIdRef.current
      const run = history.find((item) => item.id === activeRunId)
      if (!run) return
      const nextScores = {
        ...run.scores,
        [modelId]: { ...emptyScore(), ...(run.scores[modelId] ?? {}), [field]: value },
      } as Record<string, ScoreEntry>
      const updated = { ...run, scores: nextScores, winner: determineWinner(run.selectedModels, nextScores) }
      setHistory(updateRunHistory(updated))
    },
    [history]
  )

  const modelSources = [...catalogModels, ...MOCK_MODELS, ...RETIRED_MODELS]
  const models = state.selectedModels.map((id) => modelSources.find((model) => model.id === id) ?? {
    id,
    label: id.startsWith("hf-") ? id.slice(3) : id,
    color: "#80d8c8",
    personality: getModelEngine(id),
    modelId: id.startsWith("hf-") ? id.slice(3) : undefined,
  })

  const canExport = models.some((model) => Boolean(state.responses[model.id]))
  const currentMetrics = models.map((model) => ({ model, metrics: calculateHeuristicMetrics(state.prompt, state.responses[model.id] ?? "") }))

  const handleExport = useCallback((format: "json" | "markdown" | "csv") => {
    if (!canExport) return
    const data = getExportData(state, models)
    if (format === "json") {
      downloadFile(JSON.stringify(data, null, 2), "ai-benchmark-run.json", "application/json")
    } else if (format === "markdown") {
      downloadFile(toMarkdown(data), "ai-benchmark-run.md", "text/markdown")
    } else if (format === "csv") {
      downloadFile(toCsv(data.models.map((model) => ({ model: model.model, modelId: model.modelId, response: model.response, score: model.score, heuristicMetrics: model.heuristicMetrics, winner: data.winner }))), "ai-benchmark-run.csv", "text/csv")
    }
  }, [canExport, state, models])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-100">Hugging Face Inference Providers</p>
          <p className="mt-1 text-xs text-slate-500">{catalogStatus === "live" ? catalogModels.length + " models discovered from live provider routes" : catalogStatus === "loading" ? "Checking current model availability" : "Using curated current model choices"}</p>
        </div>
        <span className={"rounded-full px-3 py-1.5 text-[11px] font-medium " + (catalogStatus === "live" ? "bg-emerald-300/10 text-emerald-200" : "bg-sky-300/10 text-sky-200")}>{catalogStatus === "live" ? "Catalogue connected" : catalogStatus === "loading" ? "Connecting" : "Fallback mode"}</span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{isStreaming ? "Model responses are streaming." : "Model responses are not streaming."}</p>
      {hasRetiredModel && (
        <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-sm text-amber-200">
          This restored run contains a retired provider. The saved response can be viewed, but new runs must use current Hugging Face models.
        </p>
      )}
      {hasHistoricalModel && !hasRetiredModel && (
        <p className="rounded-xl border border-sky-300/15 bg-sky-300/[0.04] p-3 text-sm text-sky-100">
          This restored run contains a historical mock model. Select two current hosted models before running a new comparison.
        </p>
      )}

      {needsHfToken && (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-100">Connect your inference token</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Stored only in this page's memory. Requests are sent from your browser to Hugging Face; the token is never saved to run history or exports.</p>
          </div>
          <label htmlFor="hf-token" className="mb-1.5 block text-xs font-medium text-slate-300">Hugging Face Inference token</label>
          <input
            id="hf-token"
            type="password"
            autoComplete="off"
            aria-label="Hugging Face Inference token"
            value={hfToken}
            onChange={(event) => setHfToken(event.target.value)}
            placeholder="hf_..."
            className="field-surface h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-600"
          />
          <p className="mt-2 text-[11px] text-slate-600">Use a token with the minimum Inference Providers permissions required.</p>
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-950/50 border border-red-800 text-red-200 rounded-lg p-3 text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void handleCompare()} disabled={isStreaming}>Retry</Button>
        </div>
      )}

      <PromptInput
        prompt={state.prompt}
        selectedModels={state.selectedModels}
        models={catalogModels}
        prompts={BENCHMARK_PROMPTS}
        benchmarkCount={LATEST_BENCHMARKS.length}
        isStreaming={isStreaming}
        catalogStatus={catalogStatus}
        catalogUpdatedAt={catalogUpdatedAt}
        catalogMessage={catalogError ?? (catalogStatus === "live" ? "Live chat models with at least one responding provider." : "Showing a small current-model fallback list. Refresh after adding a token if discovery is blocked.")}
        isRefreshingModels={isRefreshingModels}
        onRefreshModels={() => void refreshModelCatalog(hfToken)}
        onPromptChange={(value) => dispatch({ type: "SET_PROMPT", payload: value })}
        onModelChange={(slot, modelId) => dispatch({ type: "SET_MODEL", payload: { slot, modelId } })}
        onCompare={handleCompare}
      />

      {isStreaming && (
        <Button variant="destructive" onClick={handleStop} className="w-full">
          Stop
        </Button>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {models.map((model) => (
          <ModelPane
            key={model.id}
            model={model}
            response={state.responses[model.id] ?? ""}
            isStreaming={state.streaming[model.id] ?? false}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {models.map((model) => (
          <Scorecard
            key={model.id}
            modelId={model.id}
            modelLabel={model.label}
            modelColor={model.color}
            score={state.scores[model.id]}
            disabled={!state.responses[model.id] || isStreaming}
            onScore={handleScore}
          />
        ))}
      </div>

      {canExport && (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => handleExport("json")}>
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => handleExport("markdown")}>
            Export Markdown
          </Button>
          <Button variant="outline" onClick={() => handleExport("csv")}>
            Export CSV
          </Button>
        </div>
      )}

      <section className="studio-panel space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Automatic evaluation signals</h2>
          <p className="mt-1 text-xs text-zinc-500">Heuristics only. Prompt-term coverage and formatting signals do not establish factual correctness or overall model quality.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {currentMetrics.map(({ model, metrics }) => (
            <div key={model.id} className="rounded-md border border-zinc-800 p-3 text-sm">
              <p className="font-medium" style={{ color: model.color }}>{model.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <span>Prompt-term coverage</span><span className="text-right text-zinc-200">{metrics.promptTermCoverage}%</span>
                <span>Response words</span><span className="text-right text-zinc-200">{metrics.responseWords}</span>
                <span>Sentences</span><span className="text-right text-zinc-200">{metrics.sentenceCount}</span>
                <span>Requested structure</span><span className="text-right text-zinc-200">{metrics.structureSignal === null ? "N/A" : metrics.structureSignal ? "Detected" : "Not detected"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <WinnerBar models={models} scores={state.scores} />

      <section className="studio-panel space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Recent run history</h2>
          <p className="mt-1 text-xs text-zinc-500">Saved in this browser only, up to 30 runs. Clearing browser storage removes this history.</p>
        </div>
        {history.length ? (
          <div className="space-y-2">
            {history.slice(0, 10).map((run) => (
              <div key={run.id} className="flex flex-col gap-2 rounded-md border border-zinc-800 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{run.prompt}</p>
                  <p className="mt-1 text-xs text-zinc-500">{new Date(run.createdAt).toLocaleString()} · {run.status} · {(run.durationMs / 1000).toFixed(1)}s</p>
                </div>
                <Button size="sm" variant="outline" disabled={isStreaming} onClick={() => {
                  activeRunIdRef.current = run.id
                  dispatch({ type: "SET_PROMPT", payload: run.prompt })
                  dispatch({ type: "SET_MODEL", payload: { slot: 0, modelId: run.selectedModels[0] } })
                  dispatch({ type: "SET_MODEL", payload: { slot: 1, modelId: run.selectedModels[1] } })
                  dispatch({ type: "RESET_RESPONSES" })
                  Object.entries(run.responses).forEach(([modelId, response]) => {
                    dispatch({ type: "START_STREAM", payload: { modelId } })
                    dispatch({ type: "APPEND_CHUNK", payload: { modelId, chunk: response } })
                    dispatch({ type: "END_STREAM", payload: { modelId } })
                  })
                  Object.entries(run.scores).forEach(([modelId, score]) => {
                    Object.entries(score).forEach(([field, value]) => {
                      dispatch({ type: "SET_SCORE", payload: { modelId, field: field as keyof ScoreEntry, value: value as number } })
                    })
                  })
                }}>Restore run</Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No saved runs yet. Complete a comparison to start a local history.</p>
        )}
      </section>
      <BenchmarkLibrary />
    </div>
  )
}
