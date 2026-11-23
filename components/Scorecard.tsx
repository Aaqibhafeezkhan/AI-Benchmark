"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import type { ScoreEntry } from "@/lib/types"

interface ScorecardProps {
  modelId: string
  modelLabel: string
  modelColor: string
  score: ScoreEntry | undefined
  disabled: boolean
  onScore: (modelId: string, field: keyof ScoreEntry, value: number) => void
}

const fields: { key: keyof ScoreEntry; label: string; detail: string }[] = [
  { key: "accuracy", label: "Accuracy", detail: "Correctness and completeness" },
  { key: "tone", label: "Clarity", detail: "Clarity, structure, and usefulness" },
  { key: "speed", label: "Speed", detail: "Perceived response speed" },
]

export function Scorecard({ modelId, modelLabel, modelColor, score, disabled, onScore }: ScorecardProps) {
  const values = [score?.accuracy, score?.tone, score?.speed]
  const isComplete = values.every((value) => typeof value === "number")
  const average = isComplete ? Math.round(values.reduce<number>((total, value) => total + (value as number), 0) / 3) : null

  const getScoreColor = (value: number) => {
    if (value < 4) return "text-rose-300"
    if (value <= 6) return "text-amber-200"
    return "text-emerald-200"
  }

  return (
    <Card className="min-w-0 flex-1 border-white/[0.08] bg-slate-950/55 shadow-none">
      <CardHeader className="pb-3">
        <p className="eyebrow">Manual evaluation</p>
        <CardTitle className="mt-2 truncate text-sm font-semibold text-slate-100">{modelLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {fields.map(({ key, label, detail }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <label className="text-sm font-medium text-slate-200" htmlFor={modelId + "-" + key}>{label}</label>
                <p className="mt-0.5 text-[10px] text-slate-600">{detail}</p>
              </div>
              <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-200">
                {score?.[key] ?? "—"}<span className="ml-0.5 text-[10px] text-slate-600">/10</span>
              </span>
            </div>
            <Slider
              id={modelId + "-" + key}
              min={1}
              max={10}
              step={1}
              value={[score?.[key] ?? 5]}
              disabled={disabled}
              onValueChange={([value]) => onScore(modelId, key, value)}
              aria-label={modelLabel + " " + label + " score"}
              style={{ "--slider-color": modelColor } as React.CSSProperties}
            />
          </div>
        ))}
        <Separator className="bg-white/[0.08]" />
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Average score</span>
            <p className="mt-1 text-[10px] text-slate-600">All three dimensions required</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={"font-mono text-3xl font-semibold " + (disabled || average === null ? "text-slate-600" : getScoreColor(average))}>{disabled || average === null ? "—" : average}</span>
            <span className="text-xs text-slate-500">/10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
