"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ModelConfig } from "@/lib/types"
import { getModelEngine } from "@/lib/models"

interface ModelPaneProps {
  model: ModelConfig
  response: string
  isStreaming: boolean
}

export function ModelPane({ model, response, isStreaming }: ModelPaneProps) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const handleCopy = async () => {
    if (!response) return
    try {
      await navigator.clipboard.writeText(response)
      setCopied(true)
      setCopyFailed(false)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
      setCopyFailed(true)
    }
  }

  const providerLabel = model.providerCount
    ? "HF · " + model.providerCount + " routes"
    : getModelEngine(model.id) === "github"
      ? "Retired"
      : getModelEngine(model.id) === "hf"
        ? "Hugging Face"
        : "Historical simulation"
  const modelDetails = [
    model.providers?.length ? model.providers.join(" · ") : "",
    model.contextLength ? "up to " + model.contextLength.toLocaleString() + " context" : "",
    model.throughput ? Math.round(model.throughput) + " tokens/sec" : "",
  ].filter(Boolean).join("  /  ")

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/65" aria-label={model.label + " response"}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: model.color }} />
            <h3 className="truncate text-sm font-semibold text-slate-100">{model.label}</h3>
          </div>
          <p className="mt-1 truncate pl-[18px] text-[10px] text-slate-600">{model.modelId ?? "Saved historical model"}</p>
          {modelDetails ? <p className="mt-1 truncate pl-[18px] text-[10px] text-slate-500">{modelDetails}</p> : null}
        </div>
        <Badge variant="outline" className="shrink-0 border-white/10 bg-white/[0.04] text-[10px] font-medium text-slate-300">{providerLabel}</Badge>
      </div>

      <div className="relative min-h-[280px] max-h-[480px] overflow-y-auto px-4 py-5 sm:px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-teal-300/[0.025] to-transparent" />
        {response ? (
          <>
            <pre aria-live="off" className="relative whitespace-pre-wrap break-words font-mono text-[13px] leading-7 text-slate-300">
              {response}
              {isStreaming ? <span className="ml-0.5 animate-pulse text-teal-200">▋</span> : null}
            </pre>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="absolute right-3 top-2 h-7 border border-white/[0.06] bg-slate-950/80 px-2 text-[11px] text-slate-300 hover:bg-slate-800">
              {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy"}
            </Button>
          </>
        ) : (
          <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-lg text-slate-600">↗</span>
            <p className="text-sm font-medium text-slate-400">Waiting for a response</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-600">Run the comparison to stream this model’s answer into the workspace.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-slate-600">
        <span>{isStreaming ? "Generating response" : response ? "Response complete" : "No response yet"}</span>
        <span className="font-mono">{response.length.toLocaleString()} characters</span>
      </div>
    </section>
  )
}
