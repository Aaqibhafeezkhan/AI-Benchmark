# AI Benchmark

AI Benchmark is a Next.js application for comparing LLM responses side by side. It supports mock simulations for offline experimentation and real model calls through supported providers, with streamed responses and manual scoring.

## What you can do

- Compare two models against the same prompt in real time.
- Load runnable benchmark prompts for coding, reasoning, summarization, instruction following and factual QA.
- View the latest LiveBench leaderboard directly from its public release data.
- Use mock models without API keys.
- Use supported real-model providers when you supply your own token.
- Score responses manually and inspect the winner for the current comparison.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

For a production check:

```bash
npm run build
npx serve out
```

## Benchmark contract

A **playground comparison** is an interactive side-by-side model experience. It can use mock or live providers, manual scoring and ad-hoc prompts, and is primarily intended for exploration.

A **benchmark run** is a reproducible evaluation record built around a versioned `BenchmarkCase`, explicit `BenchmarkModel` metadata, execution status and timestamps, per-model responses, scores and an explicit winner or tie. The contract types live in `lib/benchmark-contracts.ts` and are versioned with `BENCHMARK_CONTRACT_VERSION`.

The contract separates:

- **Case**: the versioned prompt and task category being evaluated.
- **Model**: provider, model identity and mock/provider execution mode.
- **Run**: one execution of one case against a defined model set, including lifecycle status and timing metadata.
- **Score**: manual evaluation dimensions. A missing score is represented by `null` rather than an implicit zero.
- **Result**: the response, score, timing and error state for each model in a run.
- **Winner**: one model identifier, an explicit `tie`, or `null` when a run has not produced a scored outcome.

The contract does not claim that a live model comparison is scientifically reproducible across time. Provider behavior, model versions, network conditions, rate limits and external service changes can affect live results. Mock mode is useful for deterministic UI experimentation, while provider-backed runs should be treated as observations from the selected model and configuration at execution time.

## Benchmarks

The application separates runnable prompts from benchmark metadata. Runnable prompts are designed for repeatable side-by-side comparisons. The benchmark catalog currently tracks the latest public releases used as reference points:

- LiveBench 2026-06-25: 23 objective tasks across Reasoning, Coding, Agentic Coding, Mathematics, Data Analysis, Language and Instruction Following.
- Artificial Analysis Intelligence Index v4.1.1: GDPval-AA v2, τ³-Banking, Terminal-Bench v2.1, SciCode, Humanity's Last Exam, GPQA Diamond, CritPt, AA-Omniscience and AA-LCR.

LiveBench questions and scores are maintained by LiveBench rather than copied into this repository. The application fetches the public leaderboard CSV at runtime and refreshes it every five minutes, with a manual refresh control. This keeps displayed benchmark results current without requiring a new application build.

LiveBench source: https://livebench.ai/

Artificial Analysis source: https://artificialanalysis.ai/models/

The benchmark leaderboard is reference data. AI Benchmark's actual model comparisons remain live calls against the selected provider or local mock engine, so a benchmark run measures the responses produced at the time you run it.

## Model modes

### Mock mode

Models marked as mock use the local simulation engine and do not make network calls. This is the easiest mode for testing the UI or deploying a public demo without asking visitors for credentials.

### Real provider mode

The application can call supported real models through Hugging Face and GitHub Models when the user supplies a token during the session. Tokens are not committed to the repository.

Use provider-specific tokens with the minimum permissions required for inference. Do not place personal access tokens directly in source files or commit them to Git.

## Manual GitHub Pages deployment

The repository uses GitHub Actions only for deployment and the workflow is intentionally manual. It runs only when you trigger it from the GitHub Actions tab with `workflow_dispatch`.

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Go to **Actions** and select **Deploy to GitHub Pages**.
5. Click **Run workflow** and run it from `main`.
6. Wait for the build and deployment jobs to finish.
7. Open the published Pages URL shown by the deployment environment.

The Next.js configuration uses static export mode and the repository path `/AI-Benchmark` as its Pages base path. The workflow publishes the generated `out` directory.

### Local Pages build check

Before triggering deployment, verify the static export locally:

```bash
npm ci
npm run build
npx serve out
```

Then open the local server and verify navigation, benchmark selection, live leaderboard loading, mock-model comparisons and scoring.

## Extending the project

### Add a benchmark prompt

Add a new entry to `BENCHMARK_PROMPTS` in `lib/benchmarks.ts`. Keep prompts focused on one capability so comparisons are easier to interpret.

### Track a benchmark release

Add a `BenchmarkDefinition` to `LATEST_BENCHMARKS` in `lib/benchmarks.ts` when a new public benchmark release becomes relevant. Keep the release identifier and source explicit.

### Add a mock model

Add an entry to `MOCK_MODELS` in `lib/models.ts` and a corresponding template in `lib/mock-engine.ts`.

### Add a real model

Add the model configuration to the relevant provider list in `lib/models.ts` and update the provider ID mapping. The comparison view routes the selected model to the appropriate response implementation.

## Suggested next step

The strongest next iteration is to turn benchmark definitions into versioned suites with per-task scoring, saved runs and aggregated results. That would move AI Benchmark closer to a reproducible evaluation tool rather than a one-off comparison interface.
