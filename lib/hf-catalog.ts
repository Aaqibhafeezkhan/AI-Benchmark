import type { ModelConfig } from "./types"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringValues(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function finiteValues(providers: UnknownRecord[], key: string): number[] {
  return providers.map((provider) => provider[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value))
}

function labelFromId(id: string): string {
  const name = id.split("/").at(-1) ?? id
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
}

export function parseHuggingFaceModelCatalog(payload: unknown, limit = 48): ModelConfig[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) throw new Error("Hugging Face returned an unrecognized model catalogue.")
  const entries = payload.data as unknown[]
  const models = entries.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id.trim()) return []
    const providers = Array.isArray(item.providers) ? item.providers.filter(isRecord) : []
    const liveProviders = providers.filter((provider) => provider.status === "live" && typeof provider.provider === "string")
    if (!liveProviders.length) return []
    const architecture = isRecord(item.architecture) ? item.architecture : null
    const inputs = architecture ? stringValues(architecture.input_modalities) : []
    const outputs = architecture ? stringValues(architecture.output_modalities) : []
    if (inputs.length && !inputs.includes("text")) return []
    if (outputs.length && !outputs.includes("text")) return []
    const providerNames = [...new Set(liveProviders.flatMap((provider) => typeof provider.provider === "string" ? [provider.provider] : []))].sort()
    const contexts = finiteValues(liveProviders, "context_length")
    const throughputs = finiteValues(liveProviders, "throughput")
    const latencies = finiteValues(liveProviders, "first_token_latency_ms")
    const createdAt = typeof item.created === "number" && Number.isFinite(item.created) ? item.created : undefined
    return [{
      id: "hf-" + item.id,
      modelId: item.id,
      label: labelFromId(item.id),
      color: ["#71e0c1", "#a99cff", "#f6c177", "#f28b9c", "#7cc7f2"][index % 5],
      personality: "hf",
      providers: providerNames,
      providerCount: providerNames.length,
      contextLength: contexts.length ? Math.max(...contexts) : undefined,
      throughput: throughputs.length ? Math.max(...throughputs) : undefined,
      firstTokenLatencyMs: latencies.length ? Math.min(...latencies) : undefined,
      createdAt,
    }]
  })
  const unique = [...new Map(models.map((model) => [model.id, model])).values()]
  unique.sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0) || left.label.localeCompare(right.label))
  return unique.slice(0, Math.max(1, Math.min(limit, 60)))
}
