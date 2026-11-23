import { describe, expect, it } from "vitest"
import { parseSSEChunks, type StreamChunkEvent } from "./stream-parser"

async function* asChunks(bytes: Uint8Array, sizes: number[]): AsyncGenerator<Uint8Array> {
  let offset = 0
  for (const size of sizes) {
    if (offset >= bytes.length) return
    const end = Math.min(offset + size, bytes.length)
    yield bytes.slice(offset, end)
    offset = end
  }
  if (offset < bytes.length) yield bytes.slice(offset)
}

async function collect(chunks: AsyncIterable<Uint8Array>): Promise<StreamChunkEvent[]> {
  const events: StreamChunkEvent[] = []
  for await (const event of parseSSEChunks(chunks)) events.push(event)
  return events
}

describe("SSE stream parser", () => {
  it("produces identical events when UTF-8 payloads are split at arbitrary byte boundaries", async () => {
    const payload = 'data: {"choices":[{"delta":{"content":"Café €"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":" done"}}]}\n\ndata: [DONE]\n\n'
    const bytes = new TextEncoder().encode(payload)
    const expected = await collect(asChunks(bytes, [bytes.length]))
    const sizes = Array.from({ length: bytes.length }, () => 1)
    const actual = await collect(asChunks(bytes, sizes))
    expect(actual).toEqual(expected)
    expect(actual.map((event) => event.content ?? "").join("")).toBe("Café € done")
    expect(actual.at(-1)?.done).toBe(true)
  })

  it("ignores blank and malformed JSON events and stops at [DONE]", async () => {
    const bytes = new TextEncoder().encode('\n\ndata: not-json\n\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n\n\ndata: [DONE]\n\ndata: {"choices":[{"delta":{"content":"ignored"}}]}\n\n')
    const events = await collect(asChunks(bytes, [3, 1, 7, 2, 11, 5]))
    expect(events).toEqual([{ content: "ok", done: false }, { done: true }])
  })

  it("flushes a final data event without a trailing blank line", async () => {
    const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"last"}}]}')
    expect(await collect(asChunks(bytes, [5, 8]))).toEqual([{ content: "last", done: false }])
  })
})
