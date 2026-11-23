# Architecture

## Module map

| Module | Responsibility |
| --- | --- |
| `app/page.tsx` | Static-exported application entry point |
| `components/CompareView.tsx` | Comparison state, provider selection, cancellation, scoring, local history and exports |
| `components/PromptInput.tsx` | Prompt selection and model controls |
| `components/ModelPane.tsx` | Streamed response display and copy action |
| `components/Scorecard.tsx` | Manual accuracy, tone and speed inputs |
| `components/WinnerBar.tsx` | Winner and tie presentation |
| `components/LiveBenchPanel.tsx` | Runtime LiveBench CSV fetch and refresh |
| `lib/models.ts` | Selectable mock and Hugging Face models plus metadata for retired saved-run entries |
| `lib/mock-engine.ts` | Deterministic response templates and controllable stream timing |
| `lib/stream-parser.ts` | Incremental server-sent event parsing |
| `lib/provider-errors.ts` | Safe provider status-to-message mapping |
| `lib/scoring.ts` | Total-score winner, tie and unscored semantics |
| `lib/livebench.ts` | Pure LiveBench CSV parser |
| `lib/benchmark-contracts.ts` | Versioned benchmark case, model, run, score and lifecycle types |

## Data flow

1. The visitor selects a prompt and two distinct models.
2. The comparison view creates one abort controller per model and prevents overlapping submissions.
3. Mock selections use local response templates. Hugging Face selections call the OpenAI-compatible Inference Providers endpoint directly from the browser with the visitor's token.
4. The Hugging Face response body is decoded incrementally as UTF-8 and parsed as server-sent events. The parser handles chunk boundaries, blank lines, malformed JSON events and the terminal marker.
5. Response chunks update the comparison reducer. The UI presents both responses, heuristic signals and separate manual score controls.
6. Completed comparisons are stored in browser localStorage. The visitor can restore a run or export the current comparison.

## Contract and scoring

The contract version is defined by `BENCHMARK_CONTRACT_VERSION` in `lib/benchmark-contracts.ts`. A run status may move from pending to running or cancelled, and from running to completed, failed or cancelled. Terminal states do not transition.

A score contains accuracy, tone and speed. Each dimension may be null until the visitor records a value. Winner calculation uses the sum of the three dimensions for both models. Higher total wins, equal totals produce a tie and any missing dimension leaves the outcome null.

## Streaming and cancellation

The stream parser uses `TextDecoder` with streaming enabled, so a multi-byte UTF-8 character split across network chunks is reconstructed before line parsing. Event data is buffered until a blank line. Malformed event payloads are ignored; the parser stops at `[DONE]`. The reader is cancelled and its lock released when the stream ends or is aborted.

Each provider request has a bounded timeout. The parent abort signal propagates to the request. The mock engine accepts injected random and wait functions so tests can control pacing without changing generated text.

## Persistence

The current history key is `ai-benchmark:run-history:v1`. It stores at most 30 recent runs in localStorage, newest first. Storage reads and writes are guarded so unavailable storage or quota failures do not prevent the active comparison from being viewed in memory. This is browser-local persistence, not a shared account history.

## Token handling

The Hugging Face token is held in React component state for the active page session. It is sent in the authorization header to the Hugging Face endpoint. It is not written to localStorage, sessionStorage, IndexedDB, cookies, URLs, logs, run records or exports. Provider error messages are mapped to fixed user-readable text rather than displaying raw response bodies.

GitHub Pages is static hosting. The token is visible to the browser session and the provider request; this application cannot provide server-side secret storage without a backend. Users should supply their own limited-scope inference tokens and clear the page session when finished.

## Decisions and rejected alternatives

- Keep static export and manual Pages deployment instead of adding a server route that Pages cannot host.
- Keep provider tokens user-supplied rather than introducing shared credentials or authentication.
- Keep manual scoring explicit instead of treating response length or token estimates as quality scores.
- Keep retired provider metadata only to label older local runs; retired models are not selectable for new comparisons.
- Keep local history limited to the current browser. Aggregate tables, portable run collections and versioned suite execution remain future work.
