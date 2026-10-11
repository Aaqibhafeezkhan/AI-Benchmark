"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    const styleId = "sweep-" + model.id
    const existing = document.getElementById(styleId)
    if (!isStreaming) {
      existing?.remove()
      return
    }
    if (!existing) {
      const style = document.createElement("style")
      style.id = styleId
      style.textContent = "@keyframes sweep-" + model.id + " { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }"
      document.head.appendChild(style)
    }
    return () => document.getElementById(styleId)?.remove()
  }, [isStreaming, model.id])

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

  const tokenCount = Math.round(
    response.split(" ").filter(Boolean).length * 1.33
  )

  return (
    <div className="flex-1 min-w-[300px]">
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
            animation: isStreaming ? `sweep-${model.id} 1.2s ease-in-out infinite` : "none",
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
            <pre className="font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
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
          {tokenCount} tokens
        </span>
      </div>
    </div>
  )
}
