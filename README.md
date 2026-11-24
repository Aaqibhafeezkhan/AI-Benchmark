# AI Benchmark

AI Benchmark is a static, browser-based model comparison workspace. It uses WebLLM to run two selected open model variants locally through WebGPU, streams their responses side by side, and keeps a searchable directory of public evaluation suites.

## What changed

- Local inference through WebLLM and public prebuilt MLC model assets.
- Two selected models are loaded into one engine and receive the same prompt.
- Streaming responses, model download/loading progress, and WebGPU compatibility messaging.
- No Hugging Face token, account, hosted inference endpoint, backend, or server-side secret.
- Light and dark themes with a browser-persisted preference.
- Up to 30 browser-local runs remain restorable, including older historical hosted/simulated records.
- Static GitHub Pages export remains supported.

## Run locally

Use Node 20 or a supported version from the package engine range.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/AI-Benchmark`.

Quality checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Local inference and model downloads

WebLLM runs open model weights inside the browser and uses WebGPU for hardware acceleration. The app offers public prebuilt MLC variants:

| Model | Approximate model memory |
| --- | ---: |
| Llama 3.2 1B Instruct | 879 MB |
| SmolLM2 360M Instruct | ~872 MB |
| SmolLM2 1.7B Instruct | ~1.8 GB |
| Llama 3.2 3B Instruct | 2.2 GB |

The first run downloads the selected model weights from public MLC assets. WebLLM uses the browser Cache API by default, so downloaded assets can be reused while the browser cache remains available. A model can take several minutes to download and initialize. Loading two models requires enough GPU memory for both, in addition to browser and operating-system memory. Close other GPU-heavy tabs if initialization fails.

A WebGPU-compatible browser and supported GPU/driver are required. If no adapter is available, the application explains the requirement and does not silently fall back to remote inference. The app is a static site; all prompt processing and generation happen in the visitor's browser after model assets have been downloaded.

Local inference removes per-request provider credentials and keeps prompts on-device. It does not provide cloud-scale model quality or guarantee identical performance across hardware. Model weights have their own licences and terms; review each model's source and licence before use.

## Theme preference and run history

The theme choice is saved in browser localStorage under `ai-benchmark:theme:v1`. Run history is saved under `ai-benchmark:run-history:v1`, with a maximum of 30 entries. Both are browser-local and are cleared if the visitor clears site storage. Historical records are retained for viewing; only the current local WebLLM models can be selected for new runs.

## Open benchmark directory

The benchmark directory links to public evaluation repositories across knowledge, reasoning, mathematics, instruction following, coding, software engineering, agents, long context, and safety. It is a source catalogue, not a benchmark runner. Official benchmark suites may require separately licensed datasets, isolated code execution, browser/desktop environments, and their own grading harnesses. Starter prompts are examples and must not be represented as official benchmark questions or scores.

The licence shown in each card refers to upstream repository code where verified. Dataset content, model weights, and leaderboard terms can differ. Check the official source before downloading or redistributing data.

## GitHub Pages deployment

Set **Repository Settings → Pages → Build and deployment → Source → GitHub Actions**. After a pull request is merged into `main`, the single `.github/workflows/deploy.yml` workflow installs dependencies, runs lint, typecheck, tests, and the static build, then deploys the `out` directory. The workflow runs only for merged pull requests; closing without merging does not deploy.

For a local static preview:

```bash
npm run build
npx serve out
```

The static export uses the repository base path `/AI-Benchmark`.

## Project structure

- `components/CompareView.tsx`: local engine lifecycle, concurrent streaming, scoring, export, and run history.
- `components/PromptInput.tsx`: prompt and local model selection.
- `components/ModelPane.tsx`: response streaming, progress, and copy action.
- `components/ThemeToggle.tsx`: persistent light/dark preference.
- `lib/local-models.ts`: supported prebuilt WebLLM model variants.
- `components/BenchmarkLibrary.tsx`: searchable benchmark source directory.
- `lib/scoring.ts`: manual score and winner calculation.

See [Architecture](docs/ARCHITECTURE.md) for design details.
