"use client"

import type { LocalModel } from "@/lib/local-models"

interface PromptInputProps {
  prompt: string
  selectedModels: [string, string]
  models: LocalModel[]
  isStreaming: boolean
  onPromptChange: (value: string) => void
  onModelChange: (slot: 0 | 1, modelId: string) => void
  onCompare: () => void
}

export function PromptInput({ prompt, selectedModels, models, isStreaming, onPromptChange, onModelChange, onCompare }: PromptInputProps) {
  return (
    <section className="studio-panel space-y-5" aria-labelledby="comparison-setup">
      <div>
        <p className="eyebrow">01 / Comparison workspace</p>
        <h2 id="comparison-setup" className="mt-2 text-xl font-semibold text-white">Choose two local models</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">Both models receive the same prompt. Inference runs in your browser using WebGPU.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((slot) => {
          const index = slot as 0 | 1
          return (
            <label key={slot} className="space-y-2 text-xs font-medium text-slate-300">
              <span>{index === 0 ? "Model A" : "Model B"}</span>
              <select value={selectedModels[index]} onChange={(event) => onModelChange(index, event.target.value)} disabled={isStreaming} className="field-surface h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-slate-100">
                {!models.some((model) => model.id === selectedModels[index]) ? <option value={selectedModels[index]} disabled>{selectedModels[index]} (saved run only)</option> : null}
                {models.map((model) => <option key={model.id} value={model.id} disabled={model.id === selectedModels[index === 0 ? 1 : 0]}>{model.label} · {model.size}</option>)}
              </select>
            </label>
          )
        })}
      </div>
      <label htmlFor="benchmark-prompt" className="block text-sm font-medium text-slate-200">Prompt</label>
      <textarea id="benchmark-prompt" value={prompt} onChange={(event) => onPromptChange(event.target.value)} disabled={isStreaming} maxLength={4000} rows={7} placeholder="Enter a prompt for both models..." className="field-surface min-h-40 w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-100 placeholder:text-slate-600" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{prompt.length.toLocaleString()} / 4,000 characters · First use downloads model weights</span>
        <button type="button" onClick={onCompare} disabled={isStreaming || !prompt.trim()} className="h-11 rounded-xl bg-teal-300 px-5 text-sm font-semibold text-slate-950 hover:bg-teal-200 disabled:opacity-50">{isStreaming ? "Generating..." : "Load models & compare"}</button>
      </div>
    </section>
  )
}
