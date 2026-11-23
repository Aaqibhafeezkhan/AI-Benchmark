# Contributing

## Development

1. Use Node 20 or a version satisfying the package engine.
2. Run `npm ci` to install the locked dependencies.
3. Run `npm run dev` to start the application.
4. Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` before opening a pull request.

## Changes

- Use Conventional Commit messages such as `fix: handle provider cancellation` or `test: cover csv parsing`.
- Add focused tests beside the library module being changed.
- Add prompts to `BENCHMARK_PROMPTS` in `lib/benchmarks.ts`.
- Add selectable mock or Hugging Face models in `lib/models.ts`.
- Keep provider tokens out of source, storage, logs and exports.
- Preserve static export compatibility and the `/AI-Benchmark` base path.
