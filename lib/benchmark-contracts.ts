export type BenchmarkRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

export type BenchmarkExecutionMode = "mock" | "provider"

export type BenchmarkWinner = string | "tie" | null

export interface BenchmarkCase {
  id: string
  title: string
  category: BenchmarkCategory
  prompt: string
  version: string
}

export type BenchmarkCategory = "Coding" | "Reasoning" | "Summarization" | "Instruction Following" | "Factual QA"

export interface BenchmarkModel {
  id: string
  label: string
  provider: string
  executionMode: BenchmarkExecutionMode
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

export const BENCHMARK_CONTRACT_VERSION = "1.0"
