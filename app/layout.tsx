import type { Metadata } from "next"
import "./globals.css"

const siteUrl = "https://aaqibhafeezkhan.github.io/AI-Benchmark/"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Benchmark",
    template: "%s | AI Benchmark",
  },
  description: "Compare two language models on one prompt with streamed responses, manual scoring and public benchmark reference data.",
  openGraph: {
    title: "AI Benchmark",
    description: "Compare two language models on one prompt with streamed responses and manual scoring.",
    url: siteUrl,
    siteName: "AI Benchmark",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Benchmark",
    description: "Compare two language models on one prompt with streamed responses and manual scoring.",
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#09090b]">{children}</body>
    </html>
  )
}
