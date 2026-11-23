import type { ScoreEntry } from "./types"

export function determineWinner(
  modelIds: readonly string[],
  scores: Record<string, Partial<ScoreEntry> | undefined>
): string | "tie" | null {
  if (modelIds.length !== 2) return null
  const totals = modelIds.map((modelId) => {
    const score = scores[modelId]
    if (!score) return null
    const values = [score.accuracy, score.tone, score.speed]
    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) return null
    return values.reduce<number>((total, value) => total + (value as number), 0)
  })
  if (totals[0] === null || totals[1] === null) return null
  if (totals[0] === totals[1]) return "tie"
  return totals[0] > totals[1] ? modelIds[0] : modelIds[1]
}

export function emptyScore(): ScoreEntry {
  return { accuracy: null, tone: null, speed: null }
}
