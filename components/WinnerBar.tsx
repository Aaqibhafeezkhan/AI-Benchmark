"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { ModelConfig, ScoreEntry } from "@/lib/types"
import { determineWinner } from "@/lib/scoring"

interface WinnerBarProps {
  models: ModelConfig[]
  scores: Record<string, ScoreEntry>
}

export function WinnerBar({ models, scores }: WinnerBarProps) {
  if (models.length !== 2) return null
  const ids = [models[0].id, models[1].id]
  const result = determineWinner(ids, scores)
  if (result === null) return null
  const totals = ids.map((id) => {
    const score = scores[id]
    return (score.accuracy as number) + (score.tone as number) + (score.speed as number)
  })
  const isDraw = result === "tie"
  const winner = isDraw ? null : models.find((model) => model.id === result) ?? null

  return (
    <Card className="overflow-hidden border-teal-200/15 bg-gradient-to-r from-teal-300/[0.08] via-slate-950/80 to-violet-300/[0.07] shadow-none">
      <CardContent className="flex flex-col gap-4 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left" aria-live="polite">
        <div>
          <p className="eyebrow">Comparison result</p>
          {isDraw ? (
            <p className="mt-1 text-lg font-semibold text-white">The scores are tied</p>
          ) : winner ? (
            <p className="mt-1 text-lg font-semibold text-white">{winner.label} leads</p>
          ) : null}
        </div>
        <div className="flex items-center justify-center gap-3 font-mono text-2xl font-semibold sm:justify-end">
          <span style={{ color: models[0].color }}>{totals[0]}</span>
          <span className="text-sm text-slate-600">vs</span>
          <span style={{ color: models[1].color }}>{totals[1]}</span>
          <span className="text-[10px] font-sans font-normal text-slate-500">/ 30</span>
        </div>
      </CardContent>
    </Card>
  )
}
