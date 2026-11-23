# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added
- Live discovery of currently served Hugging Face chat models with live-provider filtering, context and performance metadata, and curated fallback choices.
- A searchable directory of 20 public benchmark repositories covering knowledge, reasoning, maths, instruction following, coding, agents, long context, and safety.
- Original starter prompts aligned to common evaluation disciplines.
- A redesigned comparison studio with refreshed model cards, scoring panels, navigation, and responsive visual system.

### Changed
- New comparisons default to current Hugging Face-hosted models instead of older GPT-4o and Claude 3.5 simulations.
- Historical mock and retired model entries remain available only when restoring saved local runs.
- Benchmark references distinguish prompt evaluators, code execution harnesses, agent environments, and long-context runners.
- Official benchmark execution is not implied by the browser starter prompts.

## [1.0.0] - 2026-11-23

### Added
- Static-exported Next.js comparison app with mock and Hugging Face inference modes.
- Versioned benchmark contracts, runnable prompts and public benchmark reference metadata.
- Browser-local run history and JSON, Markdown and CSV exports.
- Unit coverage for mock streaming, event parsing, scoring, provider errors, CSV parsing and contract transitions.
- GitHub Actions quality workflow.
- Architecture, contribution and project documentation.

### Changed
- Removed retired GitHub Models from selectable models while retaining labels for older saved runs.
- Distinguished unscored score dimensions from recorded numeric values.
- Mapped provider errors to safe, readable messages.

### Fixed
- Hardened incremental stream parsing across UTF-8 and network chunk boundaries.
- Made mock stream timing injectable for deterministic tests.
