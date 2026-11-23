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

const fields: { key: keyof ScoreEntry; label: string }[] = [
  { key: "accuracy", label: "Accuracy" },
  { key: "tone", label: "Tone" },
  { key: "speed", label: "Speed" },
]

export function Scorecard({
  modelId,
  modelLabel,
  modelColor,
  score,
  disabled,
  onScore,
}: ScorecardProps) {
  const values = [score?.accuracy, score?.tone, score?.speed]
  const isComplete = values.every((value) => typeof value === "number")
  const average = isComplete ? Math.round(values.reduce<number>((total, value) => total + (value as number), 0) / 3) : null

  const getScoreColor = (val: number) => {
    if (val < 4) return "text-red-400"
    if (val <= 6) return "text-amber-400"
    return "text-emerald-400"
  }

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader>
        <CardTitle style={{ color: modelColor }}>{modelLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-300" htmlFor={modelId + "-" + key}>{label}</label>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: modelColor + "22", color: modelColor }}>
                {score?.[key] ?? "Not scored"}
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
        <Separator />
        <div className="flex items-end justify-between">
          <span className="text-sm text-zinc-400">Overall</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold font-mono ${disabled || average === null ? "text-zinc-500" : getScoreColor(average)}`}>
              {disabled || average === null ? "—" : average}
            </span>
            <span className="text-sm text-zinc-400">/10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
