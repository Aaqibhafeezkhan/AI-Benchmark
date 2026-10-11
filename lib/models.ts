import { ModelConfig } from "./types"

export const MOCK_MODELS: ModelConfig[] = [
  {
    id: "gpt-4o",
    label: "GPT-4o (Mock)",
    color: "#10b981",
    personality: "precise"
  },
  {
    id: "claude-sonnet",
    label: "Claude 3.5 Sonnet (Mock)",
    color: "#6366f1",
    personality: "verbose"
  },
  {
    id: "gemini-pro",
    label: "Gemini Pro (Mock)",
    color: "#f59e0b",
    personality: "structured"
  },
  {
    id: "mistral",
    label: "Mistral 7B (Mock)",
    color: "#ec4899",
    personality: "concise"
  },
  {
    id: "llama3",
    label: "Llama 3 (Mock)",
    color: "#3b82f6",
    personality: "casual"
  }
]

export const HF_MODELS: ModelConfig[] = [
  {
    id: "hf-mistral",
    label: "Mistral 7B Instruct",
    color: "#ec4899",
    personality: "hf"
  },
  {
    id: "hf-llama",
    label: "Llama 3.1 8B",
    color: "#3b82f6",
    personality: "hf"
  },
  {
    id: "hf-gemma",
    label: "Gemma 2 9B",
    color: "#f59e0b",
    personality: "hf"
  },
  {
    id: "hf-zephyr",
    label: "Zephyr 7B",
    color: "#6366f1",
    personality: "hf"
  },
  {
    id: "hf-deepseek",
    label: "DeepSeek R1 Distill",
    color: "#10b981",
    personality: "hf"
  },
]

export const GITHUB_MODELS: ModelConfig[] = [
  {
    id: "gh-gpt-4o",
    label: "OpenAI GPT-4o (Retired)",
    color: "#10b981",
    personality: "github"
  },
  {
    id: "gh-gpt-4o-mini",
    label: "GPT-4o Mini (Retired)",
    color: "#22c55e",
    personality: "github"
  },
  {
    id: "gh-phi-3",
    label: "Microsoft Phi-3 (Retired)",
    color: "#6366f1",
    personality: "github"
  },
  {
    id: "gh-mistral-large",
    label: "Mistral Large (Retired)",
    color: "#ec4899",
    personality: "github"
  },
  {
    id: "gh-llama-3-3",
    label: "Llama 3.3 70B (Retired)",
    color: "#3b82f6",
    personality: "github"
  },
  {
    id: "gh-ai21",
    label: "AI21 Jamba (Retired)",
    color: "#f59e0b",
    personality: "github"
  },
]

export const AVAILABLE_MODELS: ModelConfig[] = [
  ...MOCK_MODELS,
  ...HF_MODELS,
  ...GITHUB_MODELS,
]

export const DEFAULT_PAIR: [string, string] = ["gpt-4o", "claude-sonnet"]

export function getModelEngine(modelId: string): "mock" | "hf" | "github" {
  if (modelId.startsWith("hf-")) return "hf"
  if (modelId.startsWith("gh-")) return "github"
  return "mock"
}

export function getHFModelId(modelId: string): string {
  const map: Record<string, string> = {
    "hf-mistral": "mistralai/Mistral-7B-Instruct-v0.3",
    "hf-llama": "meta-llama/Llama-3.1-8B-Instruct",
    "hf-gemma": "google/gemma-2-9b-it",
    "hf-zephyr": "HuggingFaceH4/zephyr-7b-beta",
    "hf-deepseek": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
  }
  return map[modelId] || modelId
}

export function getGitHubModelId(modelId: string): string {
  const map: Record<string, string> = {
    "gh-gpt-4o": "openai/gpt-4o",
    "gh-gpt-4o-mini": "openai/gpt-4o-mini",
    "gh-phi-3": "microsoft/Phi-3-mini-4k-instruct",
    "gh-mistral-large": "mistralai/Mistral-large",
    "gh-llama-3-3": "meta/Llama-3.3-70B-Instruct",
    "gh-ai21": "ai21labs/AI21-Jamba-Instruct",
  }
  return map[modelId] || modelId
}
