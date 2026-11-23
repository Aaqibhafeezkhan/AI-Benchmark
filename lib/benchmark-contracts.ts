export type BenchmarkRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

export type BenchmarkExecutionMode = "mock" | "provider"

export type BenchmarkWinner = string | "tie" | null

export type BenchmarkCategory =
  | "Knowledge"
  | "Reasoning"
  | "Math & STEM"
  | "Coding"
  | "Instruction Following"
  | "Agents & Tools"
  | "Long Context"
  | "Safety"

export interface BenchmarkCase {
  id: string
  title: string
  category: BenchmarkCategory
  prompt: string
  version: string
  datasetVersion: string
}

export interface BenchmarkModel {
  id: string
  label: string
  provider: string
  modelVersion: string | null
  executionMode: BenchmarkExecutionMode
  parameters: Record<string, string | number | boolean | null>
}

export interface BenchmarkScore {
  accuracy: number | null
  tone: number | null
  speed: number | null
}

export interface BenchmarkModelResult {
  model: BenchmarkModel
  response: string
  score: BenchmarkScore | null
  startedAt: string
  completedAt: string | null
  error: string | null
}

export interface BenchmarkRun {
  id: string
  contractVersion: string
  benchmarkCase: BenchmarkCase
  models: BenchmarkModel[]
  status: BenchmarkRunStatus
  startedAt: string
  completedAt: string | null
  results: BenchmarkModelResult[]
  winner: BenchmarkWinner
}

export interface BenchmarkComparisonResult {
  runId: string
  modelId: string
  score: BenchmarkScore
  winner: boolean
}

export const BENCHMARK_CONTRACT_VERSION = "1.1"

const benchmarkRunTransitions: Record<BenchmarkRunStatus, readonly BenchmarkRunStatus[]> = {
  pending: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
}

export function canTransitionBenchmarkRunStatus(
  current: BenchmarkRunStatus,
  next: BenchmarkRunStatus
): boolean {
  return benchmarkRunTransitions[current].includes(next)
}
