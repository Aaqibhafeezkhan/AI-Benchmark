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
import { AVAILABLE_MODELS } from "@/lib/models"
import { BENCHMARK_PROMPTS, LATEST_BENCHMARKS } from "@/lib/benchmarks"
import { LiveBenchPanel } from "./LiveBenchPanel"

interface PromptInputProps {
  prompt: string
  selectedModels: [string, string]
  isStreaming: boolean
  onPromptChange: (v: string) => void
  onModelChange: (slot: 0 | 1, modelId: string) => void
  onCompare: () => void
}

export function PromptInput({
  prompt,
  selectedModels,
  isStreaming,
  onPromptChange,
  onModelChange,
  onCompare,
}: PromptInputProps) {
  const handleBenchmarkChange = (id: string) => {
    const benchmark = BENCHMARK_PROMPTS.find((item) => item.id === id)
    if (benchmark) onPromptChange(benchmark.prompt)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select onValueChange={handleBenchmarkChange} disabled={isStreaming}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Load a benchmark prompt" />
          </SelectTrigger>
          <SelectContent>
            {BENCHMARK_PROMPTS.map((benchmark) => (
              <SelectItem key={benchmark.id} value={benchmark.id}>
                {benchmark.category} · {benchmark.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {BENCHMARK_PROMPTS.length} runnable prompts · {LATEST_BENCHMARKS.length} benchmark suites
        </span>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Enter your prompt here..."
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isStreaming) {
            onCompare()
          }
        }}
        className="resize-none"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-zinc-500">
          {prompt.length} / 2000
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedModels[0]}
            onValueChange={(v) => onModelChange(0, v)}
            disabled={isStreaming}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={m.id.startsWith("gh-") || m.id === selectedModels[1]}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedModels[1]}
            onValueChange={(v) => onModelChange(1, v)}
            disabled={isStreaming}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={m.id.startsWith("gh-") || m.id === selectedModels[0]}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onCompare} disabled={isStreaming}>
            {isStreaming ? "Streaming..." : "Compare"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-zinc-600 text-right">
        Press Ctrl/⌘ + Enter to compare
      </p>
      <LiveBenchPanel />
    </div>
  )
}
