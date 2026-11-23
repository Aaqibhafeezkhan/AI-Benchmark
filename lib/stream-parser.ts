export interface StreamChunkEvent {
  content?: string
  done: boolean
}

export async function* parseSSEChunks(
  chunks: AsyncIterable<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<StreamChunkEvent> {
  const decoder = new TextDecoder()
  let buffer = ""
  let dataLines: string[] = []
  let finished = false

  const parseEvent = (): StreamChunkEvent | null => {
    if (dataLines.length === 0) return null
    const data = dataLines.join("\n")
    dataLines = []
    if (data.trim() === "[DONE]") {
      finished = true
      return { done: true }
    }
    try {
      const payload: unknown = JSON.parse(data)
      if (!payload || typeof payload !== "object") return null
      const choices = "choices" in payload && Array.isArray(payload.choices) ? payload.choices : []
      const first = choices[0]
      if (!first || typeof first !== "object" || !("delta" in first) || !first.delta || typeof first.delta !== "object") return null
      const delta = first.delta
      if (!("content" in delta) || typeof delta.content !== "string") return null
      return { content: delta.content, done: false }
    } catch {
      return null
    }
  }

  try {
    for await (const chunk of chunks) {
      if (signal?.aborted || finished) return
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (line.length === 0) {
          const event = parseEvent()
          if (event) {
            yield event
            if (event.done) return
          }
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).replace(/^ /, ""))
        }
      }
    }

    buffer += decoder.decode()
    if (buffer.length > 0 && buffer.startsWith("data:")) dataLines.push(buffer.slice(5).replace(/^ /, ""))
    const finalEvent = parseEvent()
    if (finalEvent && !signal?.aborted) yield finalEvent
  } finally {
    dataLines = []
    buffer = ""
  }
}

export async function* readSSEStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<StreamChunkEvent> {
  const reader = stream.getReader()
  async function* chunks(): AsyncGenerator<Uint8Array> {
    try {
      while (!signal?.aborted) {
        const item = await reader.read()
        if (item.done) return
        yield item.value
      }
    } finally {
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
  }
  yield* parseSSEChunks(chunks(), signal)
}
