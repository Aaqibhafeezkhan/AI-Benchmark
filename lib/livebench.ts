export interface LiveBenchRow {
  model: string
  scores: Record<string, string>
}

export interface ParsedLiveBench {
  columns: string[]
  rows: LiveBenchRow[]
}

export function parseLiveBenchCsv(text: string): ParsedLiveBench {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  if (!input.trim()) return { columns: [], rows: [] }
  const records: string[][] = []
  let record: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ",") {
      record.push(field.trim())
      field = ""
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1
      record.push(field.trim())
      if (record.some((value) => value.length > 0)) records.push(record)
      record = []
      field = ""
    } else {
      field += character
    }
  }

  if (quoted) throw new Error("LiveBench CSV contains an unterminated quoted field.")
  if (field.length > 0 || record.length > 0) {
    record.push(field.trim())
    if (record.some((value) => value.length > 0)) records.push(record)
  }
  if (records.length < 2) return { columns: [], rows: [] }

  const headers = records[0]
  const modelIndex = headers.findIndex((header) => header.toLowerCase() === "model")
  if (modelIndex < 0) throw new Error("LiveBench CSV is missing the required model column.")

  const columnIndexes = headers.map((header, index) => ({ header, index })).filter((item) => item.index !== modelIndex && item.header.length > 0)
  const columns = columnIndexes.map((item) => item.header)
  const rows = records.slice(1).map((values) => {
    const model = values[modelIndex]?.trim() ?? ""
    const scores = Object.fromEntries(columnIndexes.map(({ header, index }) => [header, values[index]?.trim() ?? ""]))
    return { model, scores }
  }).filter((row) => row.model.length > 0 && Object.values(row.scores).some((value) => value.length > 0))

  return { columns, rows: rows.slice(0, 10) }
}
