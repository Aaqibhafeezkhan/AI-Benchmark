import type { Metadata } from "next"
import "./globals.css"

const siteUrl = "https://aaqibhafeezkhan.github.io/AI-Benchmark/"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "AI Benchmark | Local Model Evaluation Studio", template: "%s | AI Benchmark" },
  description: "Compare open language models locally in your browser with WebLLM and WebGPU. No API token or backend required.",
  openGraph: { title: "AI Benchmark | Local Model Evaluation Studio", description: "Compare open models locally in your browser.", url: siteUrl, siteName: "AI Benchmark", type: "website" },
  alternates: { canonical: siteUrl },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body className="antialiased">{children}</body></html>
}
