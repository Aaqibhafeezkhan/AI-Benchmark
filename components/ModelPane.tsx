"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ModelConfig } from "@/lib/types"
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

  return (
    <div className="flex-1 min-w-0 basis-full sm:basis-[calc(50%-0.5rem)]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-100">{model.label}</span>
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            backgroundColor: `${model.color}22`,
            color: model.color,
            borderColor: `${model.color}55`,
          }}
        >
          {getModelEngine(model.id) === "github" ? "Retired" : getModelEngine(model.id) === "hf" ? "Hugging Face" : "Mock"}
        </Badge>
      </div>

      <div
        className="h-[2px] overflow-hidden mb-2"
        style={{ opacity: isStreaming ? 1 : 0 }}
      >
        <div
          className="h-full w-1/4"
          style={{
            backgroundColor: model.color,
            animation: isStreaming ? "sweep 1.2s ease-in-out infinite" : "none",
          }}
        />
      </div>

      <div className="min-h-[300px] max-h-[480px] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-2 relative">
        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1 }
            50% { opacity: 0 }
          }
        `}</style>

        {response ? (
          <>
            <pre aria-live="off" className="font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
              {response}
              {isStreaming && (
                <span
                  style={{
                    animation: "blink 1s step-start infinite",
                  }}
                >
                  ▋
                </span>
              )}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="absolute top-2 right-2"
            >
              {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy"}
            </Button>
          </>
        ) : (
          <p className="text-zinc-600 italic">Response will appear here...</p>
        )}
      </div>

      <div className="text-right mt-2">
        <span className="text-xs font-mono text-zinc-600">
          {response.length.toLocaleString()} characters
        </span>
      </div>
    </div>
  )
}
