import { describe, expect, it } from "vitest"
import { createSeededRandom, RESPONSE_TEMPLATES, streamResponse } from "./mock-engine"

async function collect(prompt: string, seed: number): Promise<string> {
  const controller = new AbortController()
  const chunks: string[] = []
  for await (const chunk of streamResponse(prompt, "precise", controller.signal, {
    random: createSeededRandom(seed),
    wait: async () => undefined,
  })) {
    chunks.push(chunk)
  }
  return chunks.join("")
}

describe("mock engine", () => {
  it("produces the same response for the same prompt and seed", async () => {
    const first = await collect("Explain deterministic tests", 42)
    const second = await collect("Explain deterministic tests", 42)
    expect(first).toBe(second)
  })

  it("streams chunks that reassemble to the complete template", async () => {
    const prompt = "Explain deterministic tests"
    expect(await collect(prompt, 17)).toBe(RESPONSE_TEMPLATES.precise(prompt))
  })

  it("stops emitting after cancellation", async () => {
    const controller = new AbortController()
    const iterator = streamResponse("A prompt", "precise", controller.signal, {
      random: () => 0,
      wait: async () => controller.abort(),
    })
    const first = await iterator.next()
    expect(first.done).toBe(false)
    const next = await iterator.next()
    expect(next.done).toBe(true)
  })
})
