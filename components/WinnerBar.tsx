"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ModelConfig, ScoreEntry } from "@/lib/types"

interface WinnerBarProps {
  models: ModelConfig[]
  scores: Record<string, ScoreEntry>
}

export function WinnerBar({ models, scores }: WinnerBarProps) {
  if (models.length < 2) return null

  const getAverage = (modelId: string): number | null => {
    const score = scores[modelId]
    if (!score || !["accuracy", "tone", "speed"].every((field) => Number.isFinite(score[field as keyof ScoreEntry]))) return null
    return (score.accuracy + score.tone + score.speed) / 3
  }

  const avgA = getAverage(models[0].id)
  const avgB = getAverage(models[1].id)

  if (avgA === null || avgB === null) return null

  const winner = avgA > avgB ? models[0] : avgB > avgA ? models[1] : null
  const isDraw = avgA === avgB

  return (
    <Card
      className="mt-6"
      style={{
        borderColor: winner ? winner.color + "55" : "#52525b",
        backgroundColor: winner ? winner.color + "11" : "#18181b",
      }}
    >
      <CardContent className="py-6 text-center">
        {isDraw ? (
          <>
            <p className="text-xl font-semibold text-zinc-300">Draw</p>
            <p className="text-sm text-zinc-500 mt-1">
              {avgA.toFixed(1)} vs {avgB.toFixed(1)}
            </p>
          </>
        ) : winner ? (
          <>
            <p className="text-xl font-semibold" style={{ color: winner.color }}>
              {winner.label} wins!
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              {avgA.toFixed(1)} vs {avgB.toFixed(1)}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
