"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ModelConfig, ScoreEntry } from "@/lib/types"
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
    <Card className="mt-6" style={{ borderColor: winner ? winner.color + "55" : "#52525b", backgroundColor: winner ? winner.color + "11" : "#18181b" }}>
      <CardContent className="py-6 text-center" aria-live="polite">
        {isDraw ? (
          <>
            <p className="text-xl font-semibold text-zinc-200">Tie</p>
            <p className="text-sm text-zinc-300 mt-1">{totals[0]} vs {totals[1]} out of 30</p>
          </>
        ) : winner ? (
          <>
            <p className="text-xl font-semibold" style={{ color: winner.color }}>{winner.label} wins</p>
            <p className="text-sm text-zinc-300 mt-1">{totals[0]} vs {totals[1]} out of 30</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
