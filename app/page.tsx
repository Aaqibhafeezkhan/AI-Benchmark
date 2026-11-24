import { CompareView } from "@/components/CompareView"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <a href="#top" className="flex items-center gap-3" aria-label="AI Benchmark home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200/20 bg-teal-200/[0.08] text-sm font-black text-teal-200">AB</span>
          <span><span className="block text-sm font-semibold tracking-wide text-white">AI BENCHMARK</span><span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Local model evaluation studio</span></span>
        </a>
        <nav className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400" aria-label="Main navigation">
          <a href="#compare" className="transition hover:text-teal-200">Compare</a>
          <a href="#benchmarks" className="transition hover:text-teal-200">Open benchmarks</a>
          <a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noreferrer" className="transition hover:text-teal-200">WebLLM ↗</a>
          <ThemeToggle />
        </nav>
      </header>
      <section id="top" className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-teal-300/[0.10] blur-[100px]" />
        <div className="relative max-w-4xl">
          <p className="eyebrow">Private by design · Runs on your device</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">Compare models. <span className="text-gradient">Keep inference local.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Run two open models side by side with WebLLM and your device’s GPU. No Hugging Face token, account, inference backend, or server-side secret is needed.</p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-teal-200/20 bg-teal-200/[0.06] px-3 py-2 text-teal-100">On-device WebGPU inference</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300">Streaming side by side</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300">Browser-cached model weights</span>
          </div>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="stat-tile"><p className="eyebrow">Inference</p><p className="mt-2 text-lg font-semibold text-white">On device</p><p className="mt-1 text-xs text-slate-500">WebLLM accelerated by WebGPU</p></div>
          <div className="stat-tile"><p className="eyebrow">First run</p><p className="mt-2 text-lg font-semibold text-white">Model download</p><p className="mt-1 text-xs text-slate-500">Weights cached by your browser</p></div>
          <div className="stat-tile"><p className="eyebrow">Run history</p><p className="mt-2 text-lg font-semibold text-white">Browser local</p><p className="mt-1 text-xs text-slate-500">Restore and export comparisons</p></div>
        </div>
      </section>
      <div id="compare" className="scroll-mt-6"><CompareView /></div>
      <footer className="mt-14 flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>AI Benchmark · Local open-model comparison workspace</span><span>Model quality and speed depend on your device and selected weights.</span>
      </footer>
    </main>
  )
}
