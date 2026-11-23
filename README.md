# AI Benchmark

AI Benchmark is an open model comparison workspace. It discovers chat models currently served by Hugging Face Inference Providers, streams two responses side by side, and provides a source-linked directory of open evaluation suites.

## What the application does

- Discovers current text chat models from the Hugging Face router model catalogue.
- Keeps a curated fallback list for environments where model discovery is unavailable.
- Compares two hosted models with the same prompt and streams both answers.
- Lets you score accuracy, clarity, and speed manually.
- Stores up to 30 runs in the current browser and supports JSON, Markdown, and CSV exports.
- Links to open benchmark repositories across knowledge, reasoning, coding, agents, long context, and safety.

The default comparison uses current Hugging Face-served models rather than the old GPT-4o and Claude 3.5 mock simulations. Historical mock and retired-provider records remain available when restoring older browser-local runs, but they are not selectable for new live comparisons.

## Run locally

Use Node 20 or a supported version from the package engine range.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/AI-Benchmark`.

Before opening a change, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Model discovery and provider calls

The application reads `https://router.huggingface.co/v1/models`. The router catalogue describes models and their provider routes, including whether a route is live and optional context length, first-token latency, and throughput. AI Benchmark filters for models with at least one live text provider, sorts by model creation time when available, and keeps provider metadata for display.

The application also carries a small curated fallback list. The model selector shows the live discovered catalogue first and includes those fallback models when they are not already present. Use **Refresh model catalogue** to retry discovery; a Hugging Face token can also be supplied for the refresh request.

Actual chat requests use the OpenAI-compatible Hugging Face endpoint:

`https://router.huggingface.co/v1/chat/completions`

The selected model is sent with the `:fastest` routing suffix. Hugging Face chooses among providers serving that model. Provider availability, model access, context limits, pricing, and performance can change. Check the model's current page and terms before use. Open weights do not mean every model has an OSI-approved open-source licence.

A Hugging Face Inference token is entered by the visitor. It remains in page memory and is sent from the browser to Hugging Face. It is not stored in localStorage, browser history, run records, or exports. This project is a static GitHub Pages application and does not provide server-side secret storage.

## Open benchmark directory

The in-app directory links to public benchmark repositories and distinguishes prompt evaluators, code execution harnesses, agent environments, and long-context runners. Its current catalogue includes:

| Area | Suites |
| --- | --- |
| Knowledge and reasoning | MMLU-Pro, GPQA Diamond, BIG-Bench Hard, TruthfulQA |
| Mathematics | GSM8K, MATH |
| Instruction following | IFEval |
| Code generation | HumanEval, MBPP, LiveCodeBench, BigCodeBench |
| Software engineering and agents | SWE-bench Verified, Terminal-Bench, BFCL V4, WebArena, AgentBench, OSWorld |
| Long context | LongBench v2, RULER |
| Safety | HarmBench |

The directory intentionally does not treat benchmark names as comparable scores. It does not download official datasets or run the full benchmark harnesses in the browser. Code-generation suites need isolated execution and grading; agent suites need their own tools and environments. The prompt picker contains original starter prompts for quick pairwise exploration. Those prompts are not official benchmark questions and their results must not be represented as benchmark scores.

The licence shown in each card is the upstream repository code licence where verified. Dataset files, task content, model weights, and hosted leaderboards may have separate terms. Check the official source before downloading or redistributing any data.

## Comparison methodology

A comparison sends the same prompt to two selected models and records their streamed text. Manual scores are subjective. Automatic signals such as prompt-term coverage, response length, and formatting are heuristics only; they do not measure factual correctness or overall model quality.

For meaningful evaluations, keep the prompt, model identifier, provider route, generation settings, and runner version fixed. For official benchmark reporting, use the benchmark's own recommended dataset, harness, and grading procedure.

## GitHub Pages deployment

GitHub Pages must use **GitHub Actions** as its source:

**Repository Settings → Pages → Build and deployment → Source → GitHub Actions**

Once that repository setting is selected, deployment is automatic after a pull request is merged into `main`. The single `.github/workflows/deploy.yml` workflow runs dependency installation, lint, typecheck, tests, and the static build. It uploads and deploys the Pages artifact only when all quality steps pass. Closing a pull request without merging does not run the job.

There is no manual **Run workflow** step and no separate CI workflow. The static export uses the repository base path `/AI-Benchmark`.

For a local static build:

```bash
npm run build
npx serve out
```

## Project structure

- `components/CompareView.tsx`: streaming comparisons, local history, scoring, and exports.
- `components/PromptInput.tsx`: prompt and model selection.
- `components/BenchmarkLibrary.tsx`: searchable benchmark directory.
- `lib/hf-catalog.ts`: Hugging Face model discovery and response validation.
- `lib/models.ts`: current fallback models and historical model labels.
- `lib/benchmarks.ts`: starter prompts and benchmark source metadata.
- `lib/stream-parser.ts`: incremental server-sent event parsing.
- `lib/scoring.ts`: total-score winner and tie logic.

See [Architecture](docs/ARCHITECTURE.md) for implementation details.
