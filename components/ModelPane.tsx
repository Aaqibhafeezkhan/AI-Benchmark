"use client"

import { useState } from "react"
import type { LocalModel } from "@/lib/local-models"

interface ModelPaneProps {
  model: LocalModel
  response: string
  isStreaming: boolean
  progress: string
}

export function ModelPane({ model, response, isStreaming, progress }: ModelPaneProps) {
  const [copied, setCopied] = useState(false)

  async function copyResponse() {
    if (!response) return
    try {
      await navigator.clipboard.writeText(response)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/65" aria-label={model.label + " response"}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{model.label}</h3>
          <p className="mt-1 text-[10px] text-slate-500">{model.size} · WebLLM / WebGPU</p>
        </div>
        <span className="rounded-full border border-teal-300/20 bg-teal-300/[0.06] px-3 py-1 text-[10px] text-teal-200">{isStreaming ? "Generating" : response ? "Complete" : "Local model"}</span>
      </div>
      <div className="relative min-h-[280px] max-h-[480px] overflow-y-auto px-4 py-5">
        {progress ? <p className="mb-3 text-xs text-teal-200" role="status">{progress}</p> : null}
        {response ? <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-7 text-slate-300">{response}{isStreaming ? <span className="animate-pulse text-teal-200">▋</span> : null}</pre> : <p className="flex min-h-[230px] items-center justify-center text-sm text-slate-500">Waiting for a local response</p>}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-slate-500">
        <span>{isStreaming ? "Generating on this device" : response ? "Response ready" : "No response yet"}</span>
        <button type="button" onClick={copyResponse} disabled={!response} className="text-teal-200 disabled:opacity-40">{copied ? "Copied" : "Copy response"}</button>
      </div>
    </section>
  )
}
