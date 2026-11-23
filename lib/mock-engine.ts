export type Personality = "precise" | "verbose" | "structured" | "concise" | "casual"

function getPromptPreview(prompt: string, wordCount: number): string {
  const words = prompt.trim().split(/\s+/)
  return words.slice(0, wordCount).join(" ")
}

function getTopicFromPrompt(prompt: string): string {
  const words = prompt.trim().toLowerCase().split(/\s+/)
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "what", "which", "who", "whom", "this", "that", "these", "those", "i", "me", "my", "myself", "we", "our", "you", "your", "he", "him", "his", "she", "her", "it", "its", "they", "them", "their"])
  const contentWords = words.filter(w => !stopWords.has(w) && w.length > 2)
  return contentWords.slice(0, 3).join(" ") || "this topic"
}

export const RESPONSE_TEMPLATES: Record<Personality, (prompt: string) => string> = {
  precise: (prompt: string) => {
    const preview = getPromptPreview(prompt, 4)
    const topic = getTopicFromPrompt(prompt)
    return `To address your question about ${preview}: ${topic} represents a fundamental concept that requires careful analysis. The approach involves identifying core principles and applying systematic reasoning to reach valid conclusions.

When examining ${topic}, several factors emerge as particularly significant. First, the underlying mechanisms demonstrate consistent patterns that can be observed across different contexts. Second, the relationship between variables follows predictable trajectories that enable reliable forecasting.

In summary: ${topic} can be understood through structured analysis of its component elements and their interactions.`
  },

  verbose: (prompt: string) => {
    const topic = getTopicFromPrompt(prompt)
    return `That's a nuanced question. Let me walk you through this carefully.

${topic} encompasses multiple dimensions that deserve thorough examination. The historical context reveals how understanding has evolved over time, with each generation contributing new insights. Furthermore, contemporary research has illuminated previously obscured aspects that challenge conventional wisdom.

It's worth noting that different perspectives offer complementary views on ${topic}. Practitioners emphasize practical applications while theorists focus on underlying principles. Both approaches yield valuable insights when integrated thoughtfully.

Building on this, the practical implications extend across numerous domains. Consider how ${topic} influences decision-making processes in organizational settings. The ripple effects create cascading impacts throughout interconnected systems.

I hope this gives you a comprehensive view of the topic.`
  },

  structured: (prompt: string) => {
    const topic = getTopicFromPrompt(prompt)
    return `Here is a structured breakdown:

1. The foundational elements of ${topic} establish the groundwork for deeper analysis. Understanding these basics provides necessary context for advanced concepts.

2. Key methodologies employed in studying ${topic} have proven effective across numerous applications. These approaches prioritize systematic investigation over random exploration.

3. Practical implementations demonstrate how theoretical knowledge translates into real-world outcomes. Examples from various fields illustrate the versatility of these principles.

4. Future developments will likely build upon current foundations while incorporating emerging innovations. The trajectory suggests continued refinement and expansion of existing frameworks.

Conclusion: ${topic} represents a well-established domain with robust theoretical foundations and practical utility.`
  },

  concise: (prompt: string) => {
    const topic = getTopicFromPrompt(prompt)
    return `${topic} involves essential principles that drive meaningful outcomes. Focus on core elements: identify key variables, assess relationships, apply systematic methods. Results follow from disciplined execution.`
  },

  casual: (prompt: string) => {
    const topic = getTopicFromPrompt(prompt)
    return `Good question! So, ${topic} is basically about understanding how things connect, you know? Honestly, it's one of those areas where you start with simple ideas and then realize there's a lot more going on beneath the surface.

The main thing to remember is that you don't need to overcomplicate it. Just focus on the basics, apply some common sense, and you'll figure it out. Most people make it harder than it needs to be, basically.

Hope that helps!`
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export interface StreamOptions {
  random?: () => number
  wait?: (milliseconds: number) => Promise<void>
}

export async function* streamResponse(
  prompt: string,
  personality: Personality,
  signal: AbortSignal,
  options: StreamOptions = {}
): AsyncGenerator<string> {
  const random = options.random ?? Math.random
  const wait = options.wait ?? sleep
  const fullResponse = RESPONSE_TEMPLATES[personality](prompt)

  for (const char of fullResponse) {
    if (signal.aborted) {
      return
    }

    yield char

    let delay = 18 + random() * 12

    if (char === " ") {
      delay += 40
    } else if (char === "." || char === "?" || char === "!") {
      delay += 120
    }

    await wait(delay)
  }
}
