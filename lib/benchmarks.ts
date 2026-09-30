import type { BenchmarkCategory } from "./benchmark-contracts"

export type { BenchmarkCategory }

export interface BenchmarkPrompt {
  id: string
  title: string
  category: BenchmarkCategory
  prompt: string
  version: string
}

export interface BenchmarkDefinition {
  id: string
  name: string
  source: string
  release: string
  categories: string[]
  description: string
}

export const BENCHMARK_DATASET_VERSION = "2026-09-30"

export const BENCHMARK_PROMPTS: BenchmarkPrompt[] = [
  {
    id: "coding-debugging",
    title: "Debug a TypeScript function",
    category: "Coding",
    prompt: "A TypeScript function is intended to remove duplicates from an array of objects by id, but it sometimes keeps duplicates. Explain the likely causes, provide a corrected implementation, and describe the time complexity.",
    version: "1.0.0",
  },
  {
    id: "reasoning-tradeoff",
    title: "Architecture trade-off",
    category: "Reasoning",
    prompt: "You are designing a small SaaS product with a React frontend and a Java backend. Compare a modular monolith with microservices for the first year of development. State assumptions, trade-offs, risks, and give a recommendation.",
    version: "1.0.0",
  },
  {
    id: "summarization-executive",
    title: "Executive summary",
    category: "Summarization",
    prompt: "Summarize this situation for an engineering manager in five bullet points: A release was delayed because integration tests were flaky, two dependencies had breaking changes, and the team discovered a production-only configuration mismatch. Include impact, root causes, immediate actions, and prevention.",
    version: "1.0.0",
  },
  {
    id: "instruction-following-format",
    title: "Structured output",
    category: "Instruction Following",
    prompt: "Create a three-day learning plan for a developer starting with GraphQL. Use exactly three numbered days. Each day must contain one goal, two learning activities, and one measurable outcome. Do not include an introduction or conclusion.",
    version: "1.0.0",
  },
  {
    id: "factual-qa-uncertainty",
    title: "Answer with uncertainty",
    category: "Factual QA",
    prompt: "Explain why a benchmark should distinguish between model knowledge, reasoning ability, and tool use. Clearly separate facts from assumptions and mention where an evaluator should avoid overclaiming.",
    version: "1.0.0",
  },
]

export const LATEST_BENCHMARKS: BenchmarkDefinition[] = [
  {
    id: "livebench-2026-06-25",
    name: "LiveBench",
    source: "LiveBench",
    release: "2026-06-25",
    categories: ["Reasoning", "Coding", "Agentic Coding", "Mathematics", "Data Analysis", "Language", "Instruction Following"],
    description: "23 objective tasks across seven categories with regularly refreshed questions and automatic scoring.",
  },
  {
    id: "aa-intelligence-v4-1-1",
    name: "Artificial Analysis Intelligence Index",
    source: "Artificial Analysis",
    release: "v4.1.1",
    categories: ["GDPval-AA v2", "τ³-Banking", "Terminal-Bench v2.1", "SciCode", "Humanity's Last Exam", "GPQA Diamond", "CritPt", "AA-Omniscience", "AA-LCR"],
    description: "Composite intelligence evaluation covering agentic work, tool use, coding, science, reasoning, knowledge reliability and long-context reasoning.",
  },
]

export const BENCHMARK_CATEGORIES: BenchmarkCategory[] = [
  "Coding",
  "Reasoning",
  "Summarization",
  "Instruction Following",
  "Factual QA",
]
