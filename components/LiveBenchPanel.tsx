"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface LiveBenchRow {
  model: string
  scores: Record<string, string>
}

interface ParsedLiveBench {
  columns: string[]
  rows: LiveBenchRow[]
}

const LIVEBENCH_CSV = "https://livebench.ai/table_2026_06_25.csv"

function parseCsv(text: string): ParsedLiveBench {
  const records: string[][] = []
  let record: string[] = []
  let field = ""
  let quoted = false
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"' && field.length === 0) {
      quoted = true
    } else if (char === ",") {
      record.push(field.trim())
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1
      record.push(field.trim())
      if (record.some((value) => value.length > 0)) records.push(record)
      record = []
      field = ""
    } else {
      field += char
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field.trim())
    if (record.some((value) => value.length > 0)) records.push(record)
  }

  if (records.length < 2) return { columns: [], rows: [] }

  const headers = records[0].map((value) => value.trim())
  const modelIndex = headers.findIndex((value) => value.toLowerCase() === "model")
  if (modelIndex < 0) return { columns: [], rows: [] }

  const indexedColumns = headers.map((name, index) => ({ name, index })).filter((column) => column.index !== modelIndex)
  const columns = indexedColumns.map((column) => column.name)
  const rows = records.slice(1).map((values) => ({
    model: values[modelIndex]?.trim() || "—",
    scores: Object.fromEntries(indexedColumns.map((column) => [column.name, values[column.index]?.trim() || "—"])),
  })).filter((row) => row.model !== "—")

  return { columns, rows: rows.slice(0, 10) }
}

export function LiveBenchPanel() {
  const [rows, setRows] = useState<LiveBenchRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(LIVEBENCH_CSV + "?t=" + Date.now(), { cache: "no-store" })
      if (!response.ok) throw new Error("LiveBench returned " + response.status)
      const parsed = parseCsv(await response.text())
      if (!parsed.rows.length || !parsed.columns.length) throw new Error("LiveBench returned no task-level scores")
      setColumns(parsed.columns)
      setRows(parsed.rows)
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load LiveBench")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => { void load() }, 300000)
    return () => window.clearInterval(interval)
  }, [load])

  const formatColumn = (column: string) =>
    column.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-200">LiveBench task-level scores</h2>
            <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-400">LIVE</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">Release 2026-06-25 · 23 objective tasks · These are per-task scores, not a composite overall ranking.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-900 bg-red-950/40 p-3 text-xs text-red-400">
          {error}. The model comparison still works independently.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="px-2 py-2 font-normal">Model</th>
                {columns.map((column) => (
                  <th key={column} className="px-2 py-2 font-normal whitespace-nowrap">{formatColumn(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.model} className="border-b border-zinc-900 last:border-0">
                  <td className="px-2 py-2 text-zinc-200 whitespace-nowrap">{row.model}</td>
                  {columns.map((column) => (
                    <td key={column} className="px-2 py-2 text-zinc-400 whitespace-nowrap">{row.scores[column] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {updatedAt && <p className="text-[10px] text-zinc-600">Fetched {updatedAt.toLocaleTimeString()}</p>}
    </section>
  )
}
