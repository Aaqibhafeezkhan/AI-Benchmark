import { describe, expect, it } from "vitest"
import { parseLiveBenchCsv } from "./livebench"

describe("LiveBench CSV parser", () => {
  it("parses a valid header and task rows", () => {
    expect(parseLiveBenchCsv("model,reasoning,coding\nModel A,8.1,7.5\n")).toEqual({
      columns: ["reasoning", "coding"],
      rows: [{ model: "Model A", scores: { reasoning: "8.1", coding: "7.5" } }],
    })
  })

  it("rejects a missing model column", () => {
    expect(() => parseLiveBenchCsv("reasoning,coding\n8.1,7.5")).toThrow("model column")
  })

  it("returns empty data for an empty file or header-only file", () => {
    expect(parseLiveBenchCsv("")).toEqual({ columns: [], rows: [] })
    expect(parseLiveBenchCsv("model,reasoning\n")).toEqual({ columns: [], rows: [] })
  })

  it("preserves quoted commas and escaped quotes", () => {
    const parsed = parseLiveBenchCsv('model,reasoning\n"Model, ""Fast""",8.1\n')
    expect(parsed.rows[0]).toEqual({ model: 'Model, "Fast"', scores: { reasoning: "8.1" } })
  })

  it("does not invent an overall composite column", () => {
    const parsed = parseLiveBenchCsv("model,reasoning,coding\nModel A,8,9\n")
    expect(parsed.columns).not.toContain("overall")
    expect(parsed.rows[0].scores).not.toHaveProperty("overall")
  })
})
