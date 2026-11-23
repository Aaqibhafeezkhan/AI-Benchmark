import type { Metadata } from "next"
import "./globals.css"

const siteUrl = "https://aaqibhafeezkhan.github.io/AI-Benchmark/"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Benchmark | Open Model Evaluation Studio",
    template: "%s | AI Benchmark",
  },
  description: "Compare current Hugging Face hosted language models side by side and explore open evaluation suites for reasoning, coding, agents, long context, and safety.",
  openGraph: {
    title: "AI Benchmark | Open Model Evaluation Studio",
    description: "Compare current hosted models and explore open evaluation suites.",
    url: siteUrl,
    siteName: "AI Benchmark",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Benchmark",
    description: "A modern open model comparison and evaluation workspace.",
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
