# Architecture

## Overview

AI Benchmark is a static-exported Next.js application. The browser loads two prebuilt model variants through WebLLM, initializes one local inference engine, streams each model's response concurrently, and stores run history and theme preference in browser localStorage. No application server or inference API is involved.

## Runtime and model catalogue

`lib/local-models.ts` is the curated list of WebLLM prebuilt model identifiers. Each identifier is selected from the library's prebuilt application configuration. The list focuses on compact quantized models that are practical for browser inference.

The app checks for `navigator.gpu` and requests an adapter before allowing a comparison. If WebGPU is unavailable or no adapter is returned, the UI displays a compatibility explanation. It does not switch to a hosted provider.

## Engine lifecycle and generation

`components/CompareView.tsx` dynamically imports WebLLM only when the visitor starts a comparison. The selected pair is passed to `CreateMLCEngine` as one array so both models are loaded sequentially into the same engine. The initialization callback updates visible model download and loading progress. The engine is reused for later runs with the same pair; changing the pair unloads the previous engine before loading the new pair.

Both models receive the same user prompt through the OpenAI-compatible `engine.chat.completions.create` interface with streaming enabled and the model identifier specified for each request. The two async streams are consumed concurrently. WebLLM maintains a generation lock per loaded model, allowing requests for distinct loaded models to proceed independently. A single abort controller stops the active comparison and calls the engine interruption method. Model assets are fetched from public MLC assets and cached through the browser Cache API by default.

The first initialization may require a substantial download and GPU memory. Both model weights must fit on the visitor's device simultaneously. Download progress and initialization status are shown in the response panels. Performance and supported model sizes vary with browser, GPU, drivers, memory, and device thermal limits.

## Persistence and theme

The theme key is `ai-benchmark:theme:v1`. The selected value is applied to the document root's `data-theme` attribute and color scheme.

Run history uses `ai-benchmark:run-history:v1` and stores up to 30 runs newest first. It contains the prompt, model identifiers, generated responses, manual scores, and duration. Reads and writes are guarded against malformed data and unavailable storage. Restored historical runs remain readable even if their previous provider identifiers are no longer selectable for new comparisons.

## Evaluation and scoring

The comparison view records streamed responses and supports manual accuracy, tone, and speed scoring. Winner calculation requires all three dimensions for both models; missing values leave the comparison unscored. Scores are subjective. The open benchmark directory is a source index only and does not execute official benchmark tasks or claim official scores.

## Static deployment

Next.js exports the application to `out` with base path `/AI-Benchmark`. GitHub Pages is configured to use GitHub Actions. The repository's single merge-only workflow runs dependency installation, lint, typecheck, tests, and static build after a pull request is merged into `main`. Only a successful build is uploaded and deployed.
