import type { ModelConfig } from "./types"

const colors = ["#71e0c1", "#a99cff", "#f6c177", "#f28b9c", "#7cc7f2", "#b7d88a", "#e2a8ee"]

export const HF_MODELS: ModelConfig[] = [
  {
    id: "hf-deepseek-ai/DeepSeek-V4.1-Flash",
    modelId: "deepseek-ai/DeepSeek-V4.1-Flash",
    label: "DeepSeek V4.1 Flash",
    color: colors[0],
    personality: "hf",
    providers: ["Available through Hugging Face"],
  },
  {
    id: "hf-zai-org/GLM-5.3",
    modelId: "zai-org/GLM-5.3",
    label: "GLM 5.3",
    color: colors[1],
    personality: "hf",
    providers: ["Available through Hugging Face"],
  },
  {
    id: "hf-Qwen/Qwen3.8-27B",
    modelId: "Qwen/Qwen3.8-27B",
    label: "Qwen 3.8 27B",
    color: colors[2],
    personality: "hf",
    providers: ["Available through Hugging Face"],
  },
  {
    id: "hf-deepseek-ai/DeepSeek-V4-Pro",
    modelId: "deepseek-ai/DeepSeek-V4-Pro",
    label: "DeepSeek V4 Pro",
    color: colors[3],
    personality: "hf",
    providers: ["Available through Hugging Face"],
  },
  {
    id: "hf-mistralai/Mistral-Large-4-1T-A52B",
    modelId: "mistralai/Mistral-Large-4-1T-A52B",
    label: "Mistral Large 4",
    color: colors[4],
    personality: "hf",
    providers: ["Available through Hugging Face"],
  },
]

export const MOCK_MODELS: ModelConfig[] = [
  { id: "gpt-4o", label: "GPT-4o (Historical simulation)", color: "#10b981", personality: "precise" },
  { id: "claude-sonnet", label: "Claude 3.5 Sonnet (Historical simulation)", color: "#6366f1", personality: "verbose" },
  { id: "gemini-pro", label: "Gemini Pro (Historical simulation)", color: "#f59e0b", personality: "structured" },
  { id: "mistral", label: "Mistral 7B (Historical simulation)", color: "#ec4899", personality: "concise" },
  { id: "llama3", label: "Llama 3 (Historical simulation)", color: "#3b82f6", personality: "casual" },
]

export const RETIRED_MODELS: ModelConfig[] = [
  { id: "gh-gpt-4o", label: "OpenAI GPT-4o (Retired)", color: "#10b981", personality: "github" },
  { id: "gh-gpt-4o-mini", label: "GPT-4o Mini (Retired)", color: "#22c55e", personality: "github" },
  { id: "gh-phi-3", label: "Microsoft Phi-3 (Retired)", color: "#6366f1", personality: "github" },
  { id: "gh-mistral-large", label: "Mistral Large (Retired)", color: "#ec4899", personality: "github" },
  { id: "gh-llama-3-3", label: "Llama 3.3 70B (Retired)", color: "#3b82f6", personality: "github" },
  { id: "gh-ai21", label: "AI21 Jamba (Retired)", color: "#f59e0b", personality: "github" },
]

export const AVAILABLE_MODELS: ModelConfig[] = HF_MODELS
export const MODEL_CATALOG: ModelConfig[] = [...HF_MODELS, ...MOCK_MODELS, ...RETIRED_MODELS]
export const DEFAULT_PAIR: [string, string] = [
  "hf-deepseek-ai/DeepSeek-V4.1-Flash",
  "hf-zai-org/GLM-5.3",
]

export function getModelEngine(modelId: string): "mock" | "hf" | "github" {
  if (modelId.startsWith("hf-")) return "hf"
  if (modelId.startsWith("gh-")) return "github"
  return "mock"
}

export function getHFModelId(modelId: string): string {
  const legacy: Record<string, string> = {
    "hf-mistral": "mistralai/Mistral-7B-Instruct-v0.3",
    "hf-llama": "meta-llama/Llama-3.1-8B-Instruct",
    "hf-gemma": "google/gemma-2-9b-it",
    "hf-zephyr": "HuggingFaceH4/zephyr-7b-beta",
    "hf-deepseek": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
  }
  if (legacy[modelId]) return legacy[modelId]
  return modelId.startsWith("hf-") ? modelId.slice(3) : modelId
}

export function historicalModelLabel(modelId: string): string {
  const stored = MODEL_CATALOG.find((model) => model.id === modelId)
  if (stored) return stored.label
  if (modelId.startsWith("hf-")) return modelId.slice(3) + " (saved model)"
  return modelId + " (saved model)"
}
