"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { parseLiveBenchCsv, type LiveBenchRow } from "@/lib/livebench"

const LIVEBENCH_CSV = "https://livebench.ai/table_2026_06_25.csv"

export function LiveBenchPanel() {
  const [rows, setRows] = useState<LiveBenchRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef(false)
  const mountedRef = useRef(false)

  const load = useCallback(async () => {
    if (inFlightRef.current || !mountedRef.current) return
    inFlightRef.current = true
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(LIVEBENCH_CSV + "?t=" + Date.now(), { cache: "no-store", signal: controller.signal })
      if (!response.ok) throw new Error("LiveBench returned HTTP " + response.status + ".")
      const parsed = parseLiveBenchCsv(await response.text())
      if (!parsed.rows.length || !parsed.columns.length) throw new Error("LiveBench returned no task-level scores.")
      if (mountedRef.current && !controller.signal.aborted) {
        setColumns(parsed.columns)
        setRows(parsed.rows)
        setUpdatedAt(new Date())
      }
    } catch (cause) {
      if (mountedRef.current && !controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Unable to load LiveBench data.")
      }
    } finally {
      inFlightRef.current = false
      if (requestRef.current === controller) requestRef.current = null
      if (mountedRef.current && !controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void load()
    const interval = window.setInterval(() => {
      if (!inFlightRef.current) void load()
    }, 300000)
    return () => {
      mountedRef.current = false
      window.clearInterval(interval)
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [load])

  const formatColumn = (column: string) => column.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4" aria-labelledby="livebench-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="livebench-title" className="text-sm font-medium text-zinc-200">LiveBench task-level scores</h2>
            <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-400">LIVE DATA</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Release 2026-06-25. Task-level scores, not a composite overall ranking.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Refresh LiveBench scores">
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {loading && rows.length === 0 ? <p role="status" className="text-sm text-zinc-400">Loading LiveBench scores...</p> : null}
      {error ? <div role="alert" className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}. Model comparisons work independently.</div> : null}
      {!loading && !error && rows.length === 0 ? <p className="text-sm text-zinc-400">No LiveBench rows are available right now.</p> : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-400">
              <tr className="border-b border-zinc-800">
                <th scope="col" className="px-2 py-2 font-medium">Model</th>
                {columns.map((column) => <th scope="col" key={column} className="px-2 py-2 font-medium whitespace-nowrap">{formatColumn(column)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.model} className="border-b border-zinc-900 last:border-0">
                  <th scope="row" className="px-2 py-2 text-zinc-200 whitespace-nowrap font-normal">{row.model}</th>
                  {columns.map((column) => <td key={column} className="px-2 py-2 text-zinc-300 whitespace-nowrap">{row.scores[column] || "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {updatedAt ? <p className="text-xs text-zinc-400">Fetched {updatedAt.toLocaleTimeString()}</p> : null}
    </section>
  )
}
