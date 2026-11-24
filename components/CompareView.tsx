"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { PromptInput } from "@/components/PromptInput"
import { ModelPane } from "@/components/ModelPane"
import { Scorecard } from "@/components/Scorecard"
import { WinnerBar } from "@/components/WinnerBar"
import { BenchmarkLibrary } from "@/components/BenchmarkLibrary"
import { LOCAL_MODELS, DEFAULT_LOCAL_PAIR, type LocalModel } from "@/lib/local-models"
import { determineWinner, emptyScore } from "@/lib/scoring"
import type { ScoreEntry } from "@/lib/types"

type SavedRun = {
  id: string
  createdAt: string
  prompt: string
  selectedModels: [string, string]
  responses: Record<string, string>
  scores: Record<string, ScoreEntry>
  durationMs: number
}

const HISTORY_KEY = "ai-benchmark:run-history:v1"
const MAX_RUNS = 30

async function createLocalEngine(modelIds: string[], onProgress: (message: string) => void) {
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm")
  return CreateMLCEngine(modelIds, {
    initProgressCallback: (report) => {
      const percentage = typeof report.progress === "number" ? Math.round(report.progress * 100) : 0
      onProgress(report.text || "Preparing model assets " + percentage + "%")
    },
  })
}

function readHistory(): SavedRun[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]")
    if (!Array.isArray(value)) return []
    return value.filter((run): run is SavedRun => Boolean(run && typeof run.id === "string" && typeof run.prompt === "string" && Array.isArray(run.selectedModels) && run.responses && typeof run.responses === "object")).slice(0, MAX_RUNS)
  } catch {
    return []
  }
}

function saveHistory(run: SavedRun): SavedRun[] {
  const next = [run, ...readHistory().filter((item) => item.id !== run.id)].slice(0, MAX_RUNS)
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    return next
  }
  return next
}

function getModel(id: string): LocalModel {
  return LOCAL_MODELS.find((model) => model.id === id) ?? { id, label: id + " (saved run)", size: "Historical", description: "Saved from an earlier version" }
}

export function CompareView() {
  const [prompt, setPrompt] = useState("Explain the difference between concurrency and parallelism with a practical example.")
  const [selectedModels, setSelectedModels] = useState<[string, string]>(DEFAULT_LOCAL_PAIR)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({})
  const [progress, setProgress] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<SavedRun[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceReady, setDeviceReady] = useState<boolean | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const engineRef = useRef<Awaited<ReturnType<typeof createLocalEngine>> | null>(null)
  const engineKeyRef = useRef("")
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setHistory(readHistory())
    let cancelled = false
    async function checkDevice() {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu
      if (!gpu) {
        if (!cancelled) setDeviceReady(false)
        return
      }
      try {
        const adapter = await gpu.requestAdapter()
        if (!cancelled) setDeviceReady(Boolean(adapter))
      } catch {
        if (!cancelled) setDeviceReady(false)
      }
    }
    void checkDevice()
    return () => {
      cancelled = true
      abortRef.current?.abort()
      if (engineRef.current) void engineRef.current.unload()
    }
  }, [])

  const models = selectedModels.map(getModel)
  const canExport = selectedModels.some((id) => Boolean(responses[id]))

  const handleModelChange = (slot: 0 | 1, modelId: string) => {
    setSelectedModels((current) => {
      const next = [...current] as [string, string]
      next[slot] = modelId
      return next
    })
    setResponses({})
    setScores({})
    setActiveRunId(null)
  }

  const handleCompare = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return
    setError(null)
    if (!selectedModels.every((id) => LOCAL_MODELS.some((model) => model.id === id))) {
      setError("This restored run uses historical hosted or simulated model IDs. Choose two current local models before starting a new comparison.")
      return
    }
    if (selectedModels[0] === selectedModels[1]) {
      setError("Choose two different local models.")
      return
    }
    if (deviceReady === false) {
      setError("WebGPU is unavailable. Use a supported browser and device with WebGPU enabled, then check your browser's GPU settings.")
      return
    }
    if (deviceReady === null) {
      setError("Checking WebGPU support. Try again in a moment.")
      return
    }

    setIsStreaming(true)
    setResponses({})
    setScores({})
    setProgress({})
    setActiveRunId(null)
    const startedAt = Date.now()
    const controller = new AbortController()
    abortRef.current = controller
    const results: Record<string, string> = {}
    const pairKey = selectedModels.join("::")

    try {
      if (!engineRef.current || engineKeyRef.current !== pairKey) {
        if (engineRef.current) await engineRef.current.unload()
        engineRef.current = null
        engineKeyRef.current = ""
        const engine = await createLocalEngine(selectedModels, (message) => {
          if (!controller.signal.aborted) setProgress({ [selectedModels[0]]: message, [selectedModels[1]]: message })
        })
        if (controller.signal.aborted) {
          await engine.unload()
          return
        }
        engineRef.current = engine
        engineKeyRef.current = pairKey
      }

      const engine = engineRef.current
      await Promise.all(selectedModels.map(async (modelId) => {
        if (controller.signal.aborted) return
        setProgress((current) => ({ ...current, [modelId]: "Generating locally on your device" }))
        try {
          const stream = await engine.chat.completions.create({
            model: modelId,
            messages: [{ role: "user", content: prompt }],
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
          })
          for await (const chunk of stream as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>) {
            if (controller.signal.aborted) break
            const content = chunk.choices?.[0]?.delta?.content
            if (typeof content === "string" && content.length) {
              results[modelId] = (results[modelId] || "") + content
              setResponses((current) => ({ ...current, [modelId]: results[modelId] }))
            }
          }
        } catch (cause) {
          if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Local generation failed.")
        }
      }))

      if (!controller.signal.aborted) {
        const run: SavedRun = {
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "run-" + startedAt,
          createdAt: new Date(startedAt).toISOString(),
          prompt,
          selectedModels: [...selectedModels] as [string, string],
          responses: results,
          scores: {},
          durationMs: Date.now() - startedAt,
        }
        setActiveRunId(run.id)
        setHistory(saveHistory(run))
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not initialize local inference.")
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsStreaming(false)
      setProgress({})
    }
  }, [prompt, selectedModels, isStreaming, deviceReady])

  function stopGeneration() {
    abortRef.current?.abort()
    if (engineRef.current) engineRef.current.interruptGenerate()
  }

  function handleScore(modelId: string, field: keyof ScoreEntry, value: number) {
    const nextScores = { ...scores, [modelId]: { ...emptyScore(), ...(scores[modelId] ?? {}), [field]: value } }
    setScores(nextScores)
    if (activeRunId) {
      const run = history.find((item) => item.id === activeRunId)
      if (run) {
        const updated = { ...run, scores: nextScores }
        const next = [updated, ...history.filter((item) => item.id !== activeRunId)].slice(0, MAX_RUNS)
        setHistory(next)
        try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { setError("Scores updated for this session but could not be saved in browser storage.") }
      }
    }
  }

  function restoreRun(run: SavedRun) {
    setPrompt(run.prompt)
    setSelectedModels(run.selectedModels)
    setResponses(run.responses)
    setScores(run.scores || {})
    setActiveRunId(run.id)
    setError(null)
  }

  function exportRun() {
    const payload = { exportedAt: new Date().toISOString(), prompt, models: models.map((model) => ({ ...model, response: responses[model.id] || "", score: scores[model.id] || null })), winner: determineWinner(selectedModels, scores) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "ai-benchmark-local-run.json"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/60 px-4 py-3">
        <div><p className="text-sm font-medium text-slate-100">Local inference runtime</p><p className="mt-1 text-xs text-slate-500">WebLLM · WebGPU · no API credentials</p></div>
        <span className={"rounded-full px-3 py-1.5 text-[11px] font-medium " + (deviceReady === true ? "bg-emerald-300/10 text-emerald-200" : deviceReady === false ? "bg-red-300/10 text-red-200" : "bg-amber-300/10 text-amber-200")}>{deviceReady === true ? "WebGPU available" : deviceReady === false ? "WebGPU unavailable" : "Checking device"}</span>
      </div>
      {deviceReady === false ? <div role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[0.05] p-4 text-sm text-red-200">This browser or device does not expose a WebGPU adapter. Use a current WebGPU-compatible browser on supported hardware. No remote inference fallback is used.</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[0.05] p-3 text-sm text-red-200">{error}</div> : null}
      <PromptInput prompt={prompt} selectedModels={selectedModels} models={LOCAL_MODELS} isStreaming={isStreaming} onPromptChange={setPrompt} onModelChange={handleModelChange} onCompare={() => void handleCompare()} />
      {isStreaming ? <button type="button" onClick={stopGeneration} className="w-full rounded-xl border border-red-300/20 bg-red-300/[0.06] py-3 text-sm font-medium text-red-200">Stop generation</button> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {models.map((model) => <ModelPane key={model.id} model={model} response={responses[model.id] || ""} isStreaming={isStreaming && Boolean(progress[model.id])} progress={progress[model.id] || ""} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {models.map((model) => <Scorecard key={model.id} modelId={model.id} modelLabel={model.label} modelColor={model.id === selectedModels[0] ? "#71e0c1" : "#a99cff"} score={scores[model.id]} disabled={!responses[model.id] || isStreaming} onScore={handleScore} />)}
      </div>
      {canExport ? <button type="button" onClick={exportRun} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.05]">Export run as JSON</button> : null}
      <WinnerBar models={models.map((model) => ({ ...model, personality: "local", color: model.id === selectedModels[0] ? "#71e0c1" : "#a99cff" }))} scores={scores} />
      <section className="studio-panel space-y-3">
        <div><h2 className="text-sm font-semibold text-slate-200">Recent run history</h2><p className="mt-1 text-xs text-slate-500">Up to 30 runs are saved in this browser. Older hosted and simulated runs remain restorable but are not selectable for new inference.</p></div>
        {history.length ? <div className="space-y-2">{history.slice(0, 10).map((run) => <div key={run.id} className="flex flex-col gap-2 rounded-xl border border-white/[0.08] p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm text-slate-200">{run.prompt}</p><p className="mt-1 text-xs text-slate-500">{new Date(run.createdAt).toLocaleString()} · {(run.durationMs / 1000).toFixed(1)}s</p></div><button type="button" onClick={() => restoreRun(run)} disabled={isStreaming} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 disabled:opacity-40">Restore run</button></div>)}</div> : <p className="text-sm text-slate-500">No saved runs yet. Complete a comparison to start a local history.</p>}
      </section>
      <BenchmarkLibrary />
    </div>
  )
}
