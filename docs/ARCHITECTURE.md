# Architecture

## Overview

AI Benchmark is a static-exported Next.js application. The browser discovers hosted chat models, sends user-owned inference requests, streams two responses, and stores comparison history locally. The open benchmark directory is a source index; it is not an embedded benchmark execution service.

## Module map

| Module | Responsibility |
| --- | --- |
| `app/page.tsx` | Hero, navigation, and evaluation workspace entry point |
| `components/CompareView.tsx` | Comparison state, provider requests, cancellation, scoring, local history, and exports |
| `components/PromptInput.tsx` | Starter prompts, model selection, catalogue status, and refresh action |
| `components/ModelPane.tsx` | Streamed response display, provider metadata, and copy action |
| `components/Scorecard.tsx` | Manual accuracy, clarity, and speed inputs |
| `components/WinnerBar.tsx` | Winner and tie presentation |
| `components/BenchmarkLibrary.tsx` | Searchable catalogue of public benchmark repositories |
| `lib/hf-catalog.ts` | Parsing and retrieval for the Hugging Face router model catalogue |
| `lib/models.ts` | Current fallback model list and historical model metadata |
| `lib/benchmarks.ts` | Original starter prompts and benchmark source metadata |
| `lib/stream-parser.ts` | Incremental server-sent event parsing |
| `lib/provider-errors.ts` | Safe provider status-to-message mapping |
| `lib/scoring.ts` | Total-score winner, tie, and unscored semantics |

## Model discovery

The catalogue request is sent to `GET https://router.huggingface.co/v1/models`. The parser treats the response as unknown data and validates the top-level `data` array, model identifiers, provider metadata, and optional architecture fields.

A selectable live entry must have at least one provider with `status: "live"`. When text input or output modalities are explicitly provided, the entry must support text. Provider names are deduplicated, available context lengths and throughput values are summarized, and the first-token latency uses the best reported value. Entries are sorted by creation timestamp when present.

The application keeps a curated fallback list of current model identifiers. The live catalogue is shown first and fallback entries are appended only when not already present. If discovery fails, the interface explains that it has switched to the curated list. A user can retry discovery and optionally send their own Hugging Face token with the request.

## Provider streaming

The comparison view sends the same prompt to two distinct Hugging Face model identifiers through the OpenAI-compatible chat completion endpoint. The `:fastest` suffix asks the router to choose a high-throughput route. One abort controller is created per model. Parent cancellation propagates to each request, and a bounded timeout prevents the UI from waiting indefinitely.

The response body is decoded incrementally as UTF-8 and parsed as server-sent events. The parser handles arbitrary chunk boundaries, blank lines, malformed JSON events, and the terminal marker. It cancels and releases the stream reader when the stream ends or the request is aborted.

## Benchmark directory and execution boundary

The benchmark directory is maintained in `lib/benchmarks.ts`. Each record contains a source repository URL, category, code licence note, and expected execution mode. The catalogue includes knowledge, reasoning, mathematics, instruction following, coding, software engineering, agent, long-context, and safety suites. The current list excludes LiveBench and proprietary benchmark indexes.

The code licence displayed in a card refers to the upstream repository code where verified. Dataset content, task data, model weights, and leaderboard terms can be separate. Users must check the official source before using or redistributing those assets.

The browser runs original starter prompts only. It does not execute HumanEval, SWE-bench, Terminal-Bench, WebArena, desktop agents, or other official harnesses. Those suites require their official datasets, sandbox, tool environment, and grading process. The app does not publish benchmark scores or simulate official results.

## Scoring

A manual score contains accuracy, clarity, and speed. Each dimension may be null until a visitor records a value. Winner calculation uses the sum of all three dimensions for both models. Higher total wins, equal totals produce a tie, and a missing dimension leaves the outcome unscored.

Prompt-term coverage, response length, sentence count, and formatting are heuristic signals only. They are not correctness scores and must not be presented as official benchmark results.

## Persistence and token handling

The history key is `ai-benchmark:run-history:v1`. It stores up to 30 recent runs in browser localStorage, newest first. Reads and writes are guarded so local storage failures do not prevent a current comparison from being viewed.

The Hugging Face token is held in React state for the current page session. It is sent in the authorization header and is not written to storage, URLs, logs, run records, or exports. GitHub Pages is static hosting and cannot provide server-side secret storage.

Historical mock and retired provider metadata remains in the model catalogue for restoring earlier saved runs. These models are not selectable for new comparisons.

## Deployment

Next.js uses static export and the repository base path `/AI-Benchmark`. The GitHub Pages workflow remains manual and publishes the generated `out` directory. Provider requests are performed by the visitor's browser at runtime.
