import { CompareView } from "@/components/CompareView"

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <a href="#top" className="flex items-center gap-3" aria-label="AI Benchmark home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200/20 bg-teal-200/[0.08] text-sm font-black tracking-tight text-teal-200">AB</span>
          <span>
            <span className="block text-sm font-semibold tracking-wide text-white">AI BENCHMARK</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Model evaluation studio</span>
          </span>
        </a>
        <nav className="flex items-center gap-5 text-xs font-medium text-slate-400" aria-label="Main navigation">
          <a href="#compare" className="transition hover:text-teal-200">Compare</a>
          <a href="#benchmarks" className="transition hover:text-teal-200">Open benchmarks</a>
          <a href="https://huggingface.co/inference/models" target="_blank" rel="noreferrer" className="transition hover:text-teal-200">Model catalogue ↗</a>
        </nav>
      </header>

      <section id="top" className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-teal-300/[0.10] blur-[100px]" />
        <div className="pointer-events-none absolute left-[40%] top-10 h-60 w-60 rounded-full bg-violet-400/[0.08] blur-[90px]" />
        <div className="relative max-w-4xl">
          <p className="eyebrow">Compare current hosted models · inspect open evaluation suites</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">See how today’s models <span className="text-gradient">compare in practice.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Run the same prompt through two models served by Hugging Face Inference Providers. Review streamed answers, score the trade-offs, and explore the open evaluation suites behind modern model research.</p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-teal-200/20 bg-teal-200/[0.06] px-3 py-2 text-teal-100">Live model discovery</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300">Side-by-side streaming</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300">Open benchmark directory</span>
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="stat-tile"><p className="eyebrow">Model source</p><p className="mt-2 text-lg font-semibold text-white">Hugging Face</p><p className="mt-1 text-xs text-slate-500">Live routed chat catalogue</p></div>
          <div className="stat-tile"><p className="eyebrow">Evaluation</p><p className="mt-2 text-lg font-semibold text-white">Open suites</p><p className="mt-1 text-xs text-slate-500">Knowledge, code, agents, context, safety</p></div>
          <div className="stat-tile"><p className="eyebrow">Run history</p><p className="mt-2 text-lg font-semibold text-white">Browser local</p><p className="mt-1 text-xs text-slate-500">Restore and export comparisons</p></div>
        </div>
      </section>

      <div id="compare" className="scroll-mt-6">
        <CompareView />
      </div>

      <footer className="mt-14 flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>AI Benchmark · Open model comparison workspace</span>
        <span>Model availability, routing, licences, and provider costs can change.</span>
      </footer>
    </main>
  )
}
