import { describe, expect, it } from "vitest"
import { canTransitionBenchmarkRunStatus } from "./benchmark-contracts"

describe("benchmark contract lifecycle", () => {
  it("allows pending runs to start or cancel", () => {
    expect(canTransitionBenchmarkRunStatus("pending", "running")).toBe(true)
    expect(canTransitionBenchmarkRunStatus("pending", "cancelled")).toBe(true)
  })

  it("allows running runs to complete, fail or cancel", () => {
    expect(canTransitionBenchmarkRunStatus("running", "completed")).toBe(true)
    expect(canTransitionBenchmarkRunStatus("running", "failed")).toBe(true)
    expect(canTransitionBenchmarkRunStatus("running", "cancelled")).toBe(true)
  })

  it("rejects invalid terminal and skipped transitions", () => {
    expect(canTransitionBenchmarkRunStatus("pending", "completed")).toBe(false)
    expect(canTransitionBenchmarkRunStatus("completed", "running")).toBe(false)
    expect(canTransitionBenchmarkRunStatus("failed", "completed")).toBe(false)
    expect(canTransitionBenchmarkRunStatus("cancelled", "running")).toBe(false)
  })
})
