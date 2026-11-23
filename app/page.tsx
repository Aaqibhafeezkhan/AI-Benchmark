import { CompareView } from "@/components/CompareView"

export default function Home() {
  return (
    <main className="max-w-screen-xl mx-auto px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-100">AI Benchmark</h1>
      <p className="text-sm text-zinc-300 mt-1">
        Compare two language models on the same prompt, stream both responses and score them side by side.
      </p>
      <div className="border-b border-zinc-800 pb-6 mb-8" />
      <CompareView />
    </main>
  )
}
