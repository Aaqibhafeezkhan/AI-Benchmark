"use client"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { historicalModelLabel } from "@/lib/models"
import type { BenchmarkPrompt } from "@/lib/benchmarks"
import type { ModelConfig } from "@/lib/types"

interface PromptInputProps {
  prompt: string
  selectedModels: [string, string]
  models: ModelConfig[]
  prompts: BenchmarkPrompt[]
  benchmarkCount: number
  isStreaming: boolean
  catalogStatus: "loading" | "live" | "curated"
  catalogUpdatedAt: string | null
  catalogMessage: string
  isRefreshingModels: boolean
  onRefreshModels: () => void
  onPromptChange: (value: string) => void
  onModelChange: (slot: 0 | 1, modelId: string) => void
  onCompare: () => void
}

export function PromptInput({
  prompt,
  selectedModels,
  models,
  prompts,
  benchmarkCount,
  isStreaming,
  catalogStatus,
  catalogUpdatedAt,
  catalogMessage,
  isRefreshingModels,
  onRefreshModels,
  onPromptChange,
  onModelChange,
  onCompare,
}: PromptInputProps) {
  const handlePromptChange = (id: string) => {
    const benchmark = prompts.find((item) => item.id === id)
    if (benchmark) onPromptChange(benchmark.prompt)
  }

  return (
    <section className="studio-panel space-y-6" aria-labelledby="comparison-setup">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">01 / Comparison workspace</p>
          <h2 id="comparison-setup" className="mt-2 text-xl font-semibold tracking-tight text-white">Set up your comparison</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">Use a starter prompt or bring your own. The same prompt is sent to both selected models.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-300">{prompts.length} starter prompts</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-300">{benchmarkCount} open suites</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="benchmark-prompt" className="text-sm font-medium text-slate-200">Prompt</label>
            <Select onValueChange={handlePromptChange} disabled={isStreaming}>
              <SelectTrigger className="field-surface w-full sm:w-[290px]" aria-label="Choose a starter prompt">
                <SelectValue placeholder="Load a starter prompt" />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.category} · {item.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            id="benchmark-prompt"
            aria-label="Benchmark prompt text"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            maxLength={2000}
            rows={7}
            placeholder="Describe the task you want both models to solve..."
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !isStreaming) onCompare()
            }}
            className="field-surface min-h-40 resize-y border-white/10 bg-slate-950/70 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus-visible:ring-teal-300/40"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{prompt.length.toLocaleString()} / 2,000 characters</span>
            <span>Ctrl / ⌘ + Enter to run</span>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4">
          <div>
            <p className="eyebrow">Model catalogue</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={"h-2 w-2 rounded-full " + (catalogStatus === "live" ? "bg-emerald-400" : catalogStatus === "loading" ? "animate-pulse bg-amber-300" : "bg-sky-300")} />
              <p className="text-sm font-medium text-slate-200">{catalogStatus === "live" ? "Live provider list" : catalogStatus === "loading" ? "Discovering models" : "Curated fallback list"}</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{catalogMessage}</p>
            {catalogUpdatedAt ? <p className="mt-1 text-[11px] text-slate-600">Updated {new Date(catalogUpdatedAt).toLocaleString()}</p> : null}
          </div>

          <div className="space-y-3">
            {[0, 1].map((slot) => {
              const index = slot as 0 | 1
              const other = selectedModels[index === 0 ? 1 : 0]
              const selectedExists = models.some((model) => model.id === selectedModels[index])
              return (
                <div key={slot} className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500" htmlFor={"model-slot-" + slot}>{slot === 0 ? "Model A" : "Model B"}</label>
                  <Select value={selectedModels[index]} onValueChange={(value) => onModelChange(index, value)} disabled={isStreaming}>
                    <SelectTrigger id={"model-slot-" + slot} className="field-surface h-auto min-h-11 w-full border-white/10 bg-slate-900/80 py-2 text-left text-xs text-slate-100" aria-label={slot === 0 ? "First model" : "Second model"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedExists ? <SelectItem value={selectedModels[index]} disabled>{historicalModelLabel(selectedModels[index])}</SelectItem> : null}
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id} disabled={model.id === other}>
                          {model.label}
                          {model.providerCount ? " · " + model.providerCount + " routes" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedExists ? (
                    <p className="truncate text-[11px] text-slate-600">{models.find((model) => model.id === selectedModels[index])?.modelId}</p>
                  ) : (
                    <p className="text-[11px] text-amber-300/80">Saved result only. Choose a current model to run a new comparison.</p>
                  )}
                </div>
              )
            })}
          </div>

          <Button onClick={onRefreshModels} disabled={isStreaming || isRefreshingModels} variant="outline" className="w-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]">
            {isRefreshingModels ? "Refreshing catalogue..." : "Refresh model catalogue"}
          </Button>
          <Button onClick={onCompare} disabled={isStreaming || !prompt.trim()} className="h-12 w-full bg-teal-300 font-semibold text-slate-950 hover:bg-teal-200 disabled:opacity-50">
            {isStreaming ? "Models are responding..." : "Run comparison"}
            {!isStreaming ? <span aria-hidden="true" className="ml-2">↗</span> : null}
          </Button>
          <p className="text-center text-[11px] leading-5 text-slate-600">Live model calls require your own Hugging Face Inference token.</p>
        </aside>
      </div>
    </section>
  )
}
