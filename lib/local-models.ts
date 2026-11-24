export type LocalModel = { id: string; label: string; size: string; description: string }

export const LOCAL_MODELS: LocalModel[] = [
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B", size: "~879 MB", description: "Compact general-purpose model" },
  { id: "SmolLM2-360M-Instruct-q4f16_1-MLC", label: "SmolLM2 360M", size: "~872 MB", description: "Lightweight instruction-tuned model" },
  { id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC", label: "SmolLM2 1.7B", size: "~1.8 GB", description: "Larger compact instruction model" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B", size: "~2.2 GB", description: "Larger local model" },
]

export const DEFAULT_LOCAL_PAIR: [string, string] = [LOCAL_MODELS[0].id, LOCAL_MODELS[1].id]

export function isSupportedLocalModel(modelId: string): boolean {
  return LOCAL_MODELS.some((model) => model.id === modelId)
}
