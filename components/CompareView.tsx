"use client"

import { useReducer, useRef, useCallback, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PromptInput } from "./PromptInput"
import { ModelPane } from "./ModelPane"
import { Scorecard } from "./Scorecard"
import { WinnerBar } from "./WinnerBar"
import { streamResponse, Personality } from "@/lib/mock-engine"
import { AVAILABLE_MODELS, DEFAULT_PAIR, getModelEngine, getHFModelId } from "@/lib/models"
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

function determineWinner(models: Array<{ id: string }>, scores: Record<string, Partial<ScoreEntry> | undefined>): string | "tie" | null {
  if (models.length < 2) return null
  const averages = models.slice(0, 2).map((model) => {
    const score = scores[model.id]
    if (!score || !["accuracy", "tone", "speed"].every((field) => Number.isFinite(score[field as keyof ScoreEntry]))) return null
    return ((score.accuracy as number) + (score.tone as number) + (score.speed as number)) / 3
  })
  if (averages.some((value) => value === null)) return null
  if (averages[0] === averages[1]) return "tie"
  return (averages[0] as number) > (averages[1] as number) ? models[0].id : models[1].id
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
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
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

  if (!response.ok) {
    const error = await response.text()
    throw new Error("Hugging Face Inference error: " + response.status + " " + error)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("Hugging Face returned no response stream")

  const decoder = new TextDecoder()
  let buffer = ""
  let receivedContent = false

  const parseEvent = (line: string): { done: boolean; content?: string } => {
    if (!line.startsWith("data:")) return { done: false }
    const data = line.slice(5).trim()
    if (!data) return { done: false }
    if (data === "[DONE]") return { done: true }
    try {
      const parsed = JSON.parse(data)
      const content = parsed.choices?.[0]?.delta?.content
      return { done: false, content: typeof content === "string" ? content : undefined }
    } catch {
      return { done: false }
    }
  }

  try {
    while (true) {
      if (signal.aborted) return
      const result = await reader.read()
      if (result.done) break
      buffer += decoder.decode(result.value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ""
      for (const line of lines) {
        const event = parseEvent(line)
        if (event.done) return
        if (event.content) {
          receivedContent = true
          yield event.content
        }
      }
    }

    buffer += decoder.decode()
    for (const line of buffer.split(/\r?\n/)) {
      const event = parseEvent(line)
      if (event.done) break
      if (event.content) {
        receivedContent = true
        yield event.content
      }
    }

    if (!receivedContent && !signal.aborted) {
      throw new Error("Hugging Face returned no generated text for this model.")
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
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
  prompt: "",
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
  const winnerId = determineWinner(models, state.scores)
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
  const activeRunIdRef = useRef<string | null>(null)
  const runInProgressRef = useRef(false)
  const cancelRequestedRef = useRef(false)

  useEffect(() => {
    setHistory(loadRunHistory())
  }, [])

  const isStreaming = Object.values(state.streaming).some(Boolean)

  const needsHfToken = state.selectedModels.some(id => getModelEngine(id) === "hf")
  const hasRetiredModel = state.selectedModels.some(id => getModelEngine(id) === "github")

  const handleCompare = useCallback(async () => {
    if (!state.prompt.trim() || isStreaming || runInProgressRef.current) return

    setError(null)

    if (state.selectedModels[0] === state.selectedModels[1]) {
      setError("Choose two different models to compare.")
      return
    }
    if (hasRetiredModel) {
      setError("GitHub Models was retired on July 30, 2026. Choose a different provider; saved results remain available in local history.")
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

    const models = state.selectedModels.map((id) =>
      AVAILABLE_MODELS.find((model) => model.id === id)
    ).filter(Boolean) as ModelConfig[]

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
              runResponses[model.id] = (runResponses[model.id] || "") + chunk
              dispatch({
                type: "APPEND_CHUNK",
                payload: { modelId: model.id, chunk },
              })
            }
          } catch (err) {
            if (!cancelRequestedRef.current) {
              runFailures[model.id] = err instanceof Error ? err.message : "The model request failed unexpectedly."
              setError(runFailures[model.id])
            }
          } finally {
            dispatch({ type: "END_STREAM", payload: { modelId: model.id } })
            if (abortControllersRef.current[model.id] === controller) {
              delete abortControllersRef.current[model.id]
            }
          }
        })
      )

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
  }, [state.prompt, state.selectedModels, isStreaming, hfToken, needsHfToken, hasRetiredModel])

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
        [modelId]: { ...(run.scores[modelId] ?? {}), [field]: value },
      } as Record<string, ScoreEntry>
      const runModels = run.selectedModels.map((id) => AVAILABLE_MODELS.find((item) => item.id === id)).filter(Boolean) as ModelConfig[]
      const updated = { ...run, scores: nextScores, winner: determineWinner(runModels, nextScores) }
      setHistory(updateRunHistory(updated))
    },
    [history]
  )

  const models = state.selectedModels.map((id) =>
    AVAILABLE_MODELS.find((m) => m.id === id)
  ).filter(Boolean) as ModelConfig[]

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
      {hasRetiredModel && (
        <p className="rounded-md border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-300">
          GitHub Models was retired on July 30, 2026. Saved results can still be restored, but this provider cannot run new comparisons.
        </p>
      )}

      {needsHfToken && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <p className="text-sm text-zinc-400">
            Selected models require API tokens. Tokens stay in memory for this tab and are not saved with run history. The static GitHub Pages build sends provider requests from your browser; use only your own limited-scope tokens.
          </p>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Hugging Face Inference token</label>
            <Textarea
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              placeholder="hf_..."
              rows={1}
              className="resize-none font-mono text-xs"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <PromptInput
        prompt={state.prompt}
        selectedModels={state.selectedModels}
        isStreaming={isStreaming}
        onPromptChange={(v) => dispatch({ type: "SET_PROMPT", payload: v })}
        onModelChange={(slot, modelId) =>
          dispatch({ type: "SET_MODEL", payload: { slot, modelId } })
        }
        onCompare={handleCompare}
      />

      {isStreaming && (
        <Button variant="destructive" onClick={handleStop} className="w-full">
          Stop
        </Button>
      )}

      <div className="flex flex-wrap gap-4">
        {models.map((model) => (
          <ModelPane
            key={model.id}
            model={model}
            response={state.responses[model.id] ?? ""}
            isStreaming={state.streaming[model.id] ?? false}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
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

      <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
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

      <section className="space-y-3 rounded-lg border border-zinc-800 p-4">
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
    </div>
  )
}
