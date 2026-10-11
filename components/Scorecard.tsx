"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { ScoreEntry } from "@/lib/types"

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
  const average = Math.round(((score?.accuracy ?? 5) + (score?.tone ?? 5) + (score?.speed ?? 5)) / 3)

  const getScoreColor = (val: number) => {
    if (val < 4) return "text-red-400"
    if (val <= 6) return "text-amber-400"
    return "text-emerald-400"
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle style={{ color: modelColor }}>{modelLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">{label}</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${modelColor}22`,
                  color: modelColor,
                }}
              >
                {score?.[key] ?? 5}
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[score?.[key] ?? 5]}
              disabled={disabled}
              onValueChange={([v]) => onScore(modelId, key, v)}
              style={{ "--slider-color": modelColor } as React.CSSProperties}
            />
          </div>
        ))}
        <Separator />
        <div className="flex items-end justify-between">
          <span className="text-sm text-zinc-500">Overall</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold font-mono ${disabled ? "text-zinc-600" : getScoreColor(average)}`}>
              {disabled ? "—" : average}
            </span>
            <span className="text-sm text-zinc-500">/10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
