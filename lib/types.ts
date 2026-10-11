export type ModelConfig = { id: string; label: string; color: string; personality: string }

export type ScoreEntry = { accuracy: number; tone: number; speed: number }

export type CompareAction =
  | { type: "SET_PROMPT"; payload: string }
  | { type: "SET_MODEL"; payload: { slot: 0 | 1; modelId: string } }
  | { type: "START_STREAM"; payload: { modelId: string } }
  | { type: "APPEND_CHUNK"; payload: { modelId: string; chunk: string } }
  | { type: "END_STREAM"; payload: { modelId: string } }
  | { type: "SET_SCORE"; payload: { modelId: string; field: keyof ScoreEntry; value: number } }
  | { type: "RESET_RESPONSES" }
  | { type: "RESTORE_RUN"; payload: { prompt: string; selectedModels: [string, string]; responses: Record<string, string>; scores: Record<string, ScoreEntry> } }

export type CompareState = {
  prompt: string
  selectedModels: [string, string]
  responses: Record<string, string>
  scores: Record<string, ScoreEntry>
  streaming: Record<string, boolean>
}
