# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-11-23

### Added
- Static-exported Next.js comparison app with mock and Hugging Face inference modes.
- Versioned benchmark contracts, runnable prompts and public benchmark reference metadata.
- LiveBench task-level CSV view with periodic and manual refresh.
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
- Prevented overlapping LiveBench refresh requests and cancelled pending requests on unmount.
- Made mock stream timing injectable for deterministic tests.
