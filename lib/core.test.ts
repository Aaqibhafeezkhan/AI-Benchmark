import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeededRandom, RESPONSE_TEMPLATES, streamResponse } from "./mock-engine"
import { parseSSEChunks, type StreamChunkEvent } from "./stream-parser"
import { determineWinner, emptyScore } from "./scoring"
import { parseLiveBenchCsv } from "./livebench"
import { canTransitionBenchmarkRunStatus } from "./benchmark-contracts"
import { providerErrorMessage, providerNetworkErrorMessage } from "./provider-errors"
import { AVAILABLE_MODELS, RETIRED_MODELS } from "./models"

async function collectMock(prompt: string, seed: number): Promise<string> {
  const controller = new AbortController()
  const chunks: string[] = []
  for await (const chunk of streamResponse(prompt, "precise", controller.signal, {
    random: createSeededRandom(seed),
    wait: async () => undefined,
  })) chunks.push(chunk)
  return chunks.join("")
}

async function* byteChunks(bytes: Uint8Array, chunkSize: number): AsyncGenerator<Uint8Array> {
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    yield bytes.slice(offset, offset + chunkSize)
  }
}

async function collectEvents(chunks: AsyncIterable<Uint8Array>): Promise<StreamChunkEvent[]> {
  const result: StreamChunkEvent[] = []
  for await (const event of parseSSEChunks(chunks)) result.push(event)
  return result
}

describe("mock engine", () => {
  it("returns identical text for identical input and seed", async () => {
    assert.equal(await collectMock("Explain deterministic tests", 42), await collectMock("Explain deterministic tests", 42))
  })

  it("reassembles streamed chunks to the complete template", async () => {
    const prompt = "Explain deterministic tests"
    assert.equal(await collectMock(prompt, 9), RESPONSE_TEMPLATES.precise(prompt))
  })

  it("stops producing chunks after cancellation", async () => {
    const controller = new AbortController()
    const iterator = streamResponse("A prompt", "precise", controller.signal, {
      random: () => 0,
      wait: async () => controller.abort(),
    })
    assert.equal((await iterator.next()).done, false)
    assert.equal((await iterator.next()).done, true)
  })
})

describe("SSE parser", () => {
  it("handles arbitrary byte splits, UTF-8 boundaries and [DONE]", async () => {
    const payload = 'data: {"choices":[{"delta":{"content":"Café €"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":" done"}}]}\n\ndata: [DONE]\n\n'
    const bytes = new TextEncoder().encode(payload)
    const expected = await collectEvents(byteChunks(bytes, bytes.length))
    const actual = await collectEvents(byteChunks(bytes, 1))
    assert.deepEqual(actual, expected)
    assert.equal(actual.map((event) => event.content ?? "").join(""), "Café € done")
    assert.equal(actual.at(-1)?.done, true)
  })

  it("ignores blank and malformed events without crashing", async () => {
    const payload = '\n\ndata: malformed-json\n\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n\n\ndata: [DONE]\n\ndata: {"choices":[{"delta":{"content":"ignored"}}]}\n\n'
    const events = await collectEvents(byteChunks(new TextEncoder().encode(payload), 7))
    assert.deepEqual(events, [{ content: "ok", done: false }, { done: true }])
  })

  it("flushes a final event without a trailing blank line", async () => {
    const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"last"}}]}')
    assert.deepEqual(await collectEvents(byteChunks(bytes, 5)), [{ content: "last", done: false }])
  })
})

describe("winner determination", () => {
  it("uses higher total score", () => {
    assert.equal(determineWinner(["a", "b"], {
      a: { accuracy: 8, tone: 7, speed: 9 },
      b: { accuracy: 7, tone: 7, speed: 8 },
    }), "a")
  })

  it("returns tie for equal totals", () => {
    assert.equal(determineWinner(["a", "b"], {
      a: { accuracy: 8, tone: 7, speed: 9 },
      b: { accuracy: 9, tone: 8, speed: 7 },
    }), "tie")
  })

  it("returns null while either model is unscored", () => {
    assert.equal(determineWinner(["a", "b"], { a: { accuracy: 10, tone: 10, speed: 10 }, b: emptyScore() }), null)
    assert.equal(determineWinner(["a", "b"], {}), null)
  })

  it("treats zero as a recorded score", () => {
    assert.equal(determineWinner(["a", "b"], {
      a: { accuracy: 0, tone: 0, speed: 0 },
      b: { accuracy: 1, tone: 1, speed: 1 },
    }), "b")
  })
})

describe("LiveBench CSV parser", () => {
  it("parses well-formed task rows", () => {
    assert.deepEqual(parseLiveBenchCsv("model,reasoning,coding\nModel A,8.1,7.5\n"), {
      columns: ["reasoning", "coding"],
      rows: [{ model: "Model A", scores: { reasoning: "8.1", coding: "7.5" } }],
    })
  })

  it("rejects a missing model column", () => {
    assert.throws(() => parseLiveBenchCsv("reasoning,coding\n8.1,7.5"), /model column/)
  })

  it("handles empty files and header-only data", () => {
    assert.deepEqual(parseLiveBenchCsv(""), { columns: [], rows: [] })
    assert.deepEqual(parseLiveBenchCsv("model,reasoning\n"), { columns: [], rows: [] })
  })

  it("preserves quoted commas and escaped quotes", () => {
    const parsed = parseLiveBenchCsv('model,reasoning\n"Model, ""Fast""",8.1\n')
    assert.deepEqual(parsed.rows[0], { model: 'Model, "Fast"', scores: { reasoning: "8.1" } })
  })

  it("does not invent an overall column", () => {
    const parsed = parseLiveBenchCsv("model,reasoning,coding\nModel A,8,9\n")
    assert.equal(parsed.columns.includes("overall"), false)
    assert.equal(Object.hasOwn(parsed.rows[0].scores, "overall"), false)
  })
})

describe("benchmark contract lifecycle", () => {
  it("allows valid pending and running transitions", () => {
    assert.equal(canTransitionBenchmarkRunStatus("pending", "running"), true)
    assert.equal(canTransitionBenchmarkRunStatus("pending", "cancelled"), true)
    assert.equal(canTransitionBenchmarkRunStatus("running", "completed"), true)
    assert.equal(canTransitionBenchmarkRunStatus("running", "failed"), true)
    assert.equal(canTransitionBenchmarkRunStatus("running", "cancelled"), true)
  })

  it("rejects invalid and terminal transitions", () => {
    assert.equal(canTransitionBenchmarkRunStatus("pending", "completed"), false)
    assert.equal(canTransitionBenchmarkRunStatus("completed", "running"), false)
    assert.equal(canTransitionBenchmarkRunStatus("failed", "completed"), false)
    assert.equal(canTransitionBenchmarkRunStatus("cancelled", "running"), false)
  })
})

describe("provider errors", () => {
  it("maps authentication, permission, rate-limit and service failures", () => {
    assert.match(providerErrorMessage(401), /authentication failed/)
    assert.match(providerErrorMessage(403), /denied/)
    assert.match(providerErrorMessage(429), /rate limit/i)
    assert.match(providerErrorMessage(503), /temporarily unavailable/)
  })

  it("does not copy provider response text into the message", () => {
    const message = providerErrorMessage(404, "Model not found. token=hf_private_value")
    assert.match(message, /model is not currently available/)
    assert.equal(message.includes("hf_private_value"), false)
  })

  it("provides a safe network failure message", () => {
    assert.match(providerNetworkErrorMessage(), /Could not reach/)
  })
})

describe("model catalog", () => {
  it("does not expose retired models as selectable models", () => {
    assert.equal(AVAILABLE_MODELS.some((model) => model.id.startsWith("gh-")), false)
    assert.equal(RETIRED_MODELS.some((model) => model.id.startsWith("gh-")), true)
  })
})
