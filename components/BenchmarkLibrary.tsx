"use client"

import { useMemo, useState } from "react"
import { LATEST_BENCHMARKS } from "@/lib/benchmarks"

const categories = ["All suites", ...new Set(LATEST_BENCHMARKS.map((item) => item.category))]

export function BenchmarkLibrary() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All suites")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return LATEST_BENCHMARKS.filter((item) => {
      const matchesCategory = category === "All suites" || item.category === category
      const text = [item.name, item.category, item.description, item.source, item.license].join(" ").toLowerCase()
      return matchesCategory && (!needle || text.includes(needle))
    })
  }, [category, query])

  return (
    <section id="benchmarks" className="studio-panel scroll-mt-8 space-y-6" aria-labelledby="benchmark-library-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">03 / Evaluation references</p>
          <h2 id="benchmark-library-title" className="mt-2 text-2xl font-semibold tracking-tight text-white">Open benchmark library</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A source-linked directory of open evaluation suites across knowledge, reasoning, coding, agents, long context, and safety.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-teal-300/20 bg-teal-300/[0.06] px-3 py-1.5 text-teal-200">{LATEST_BENCHMARKS.length} benchmark suites</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-slate-300">Source-linked catalogue</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search benchmarks, tasks, or maintainers..."
          aria-label="Search open benchmarks"
          className="field-surface h-11 rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-300/50"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter benchmarks by category"
          className="field-surface h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-200 outline-none focus:border-teal-300/50"
        >
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((benchmark, index) => (
          <article key={benchmark.id} className="group flex min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300/25 hover:bg-slate-900/80">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-teal-200">{benchmark.category}</span>
              <span className="font-mono text-[10px] text-slate-700">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="mt-4 text-base font-semibold tracking-tight text-white">{benchmark.name}</h3>
            <p className="mt-1 text-xs text-slate-500">{benchmark.source} · {benchmark.release}</p>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{benchmark.description}</p>
            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">Code licence</span>
                <span className="text-[11px] font-medium text-slate-300">{benchmark.license}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">Runner</span>
                <span className="text-[11px] text-slate-300">{benchmark.executionMode}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={"text-[10px] " + (benchmark.lifecycle === "Public research release" ? "text-emerald-300" : "text-amber-300")}>{benchmark.lifecycle}</span>
                <a href={benchmark.href} target="_blank" rel="noreferrer" className="text-xs font-semibold text-teal-200 transition group-hover:text-teal-100">Official source <span aria-hidden="true">↗</span></a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? <p className="rounded-xl border border-white/[0.08] p-6 text-center text-sm text-slate-500">No benchmark matches that search.</p> : null}

      <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.04] p-4">
        <p className="text-sm font-medium text-sky-100">Catalogue, not a browser benchmark runner</p>
        <p className="mt-1 text-xs leading-6 text-slate-400">The comparison workspace runs your own prompts against hosted chat models. Official benchmark evaluation can require licensed datasets, code sandboxes, browser or desktop environments, and pinned grading harnesses. Starter prompts are original examples, not official test items. The licence shown is for repository code; dataset and task terms may differ, so verify them at the source.</p>
      </div>
    </section>
  )
}
