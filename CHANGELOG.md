# Detox AI Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **v2.2.0 store prep tooling**
  - [`store/store-meta.json`](store/store-meta.json) — canonical privacy policy URL + repo metadata
  - Options Privacy tab link via [`src/config/store-links.ts`](src/config/store-links.ts)
  - Mod signing scripts: `signing:generate`, `signing:apply-anchor`, `signing:resign`, `store:sync-meta`
  - [`store/SCREENSHOTS.md`](store/SCREENSHOTS.md) capture guide; updated [`v2.2-store-prep.md`](docs/planning/v2.2-store-prep.md)

## [2.1.2] - 2026-06-01

### Added
- **Wizard-first configuration**
  - [`docs/planning/wizard-first-checklist.md`](docs/planning/wizard-first-checklist.md) — step → storage mapping, essential vs advanced dashboard surfaces
  - [`src/onboarding/wizard-coverage.ts`](src/onboarding/wizard-coverage.ts) + `tests/onboarding/wizard-first-coverage.spec.ts`
  - Wizard done step: **Start browsing** (primary), **Fine-tune in dashboard**, **Try on Reddit**
  - Install wizard (`?wizard=1`) closes options tab after **Start browsing**; setup-again stays on dashboard
  - Overview quick links: Filtering + Rules essential; Plugins + Privacy under Advanced collapse
  - Rules: per-site thresholds collapsed; Plugins: authenticity settings collapsed
  - Filtering: language pack section collapsed (full build)
- **Version roadmap**
  - [`docs/planning/version-roadmap.md`](docs/planning/version-roadmap.md) — v2.0 → **v3.0.0** initial public release; pre-launch refinement of scanning, filtering, and authenticity
  - Authenticity spec: script-first public data gather → AI cross-reference ([`authenticity-analysis.md`](docs/experimental/authenticity-analysis.md))
- **Filtering / heuristics**
  - Weighted keyword scoring; expanded keyword map; text-gate tuning
  - Dedicated Filtering tab; site whitelist presets; popup page status + pause on site
  - Overview status strip; plugins advanced collapse; wizard work-apps whitelist step
  - `tests/core/**` in Vitest; static core-filtering E2E fixture

### Fixed
- Chrome background `classifyBatch` now forwards policy **threshold** to inference runtime (was defaulting to 0.9)
- E2E helper `waitForClassifications` passes IPC message types into page context correctly
- Core filtering E2E imports Playwright fixtures

### Previously (2.0.x foundation)
- **Wizard language preference**
  - New **Language** setup step with JSON locale templates (`src/i18n/locales/en.json`)
  - `preferredLocale` persisted in extension storage; guide in `docs/guides/i18n.md`
  - Options dashboard, popup, browsing modes, rules, plugins, authenticity, filtering cards, and side panel wired to locale templates
  - Mod catalog labels and authenticity pipeline progress copy use `i18n:` message keys
  - **German (`de`)** locale template with `pnpm locale:de` regeneration script
  - Content-script filtered block tooltips and authenticity badge use `runtime-locale.ts`
- **Wizard and dashboard UX**
  - Onboarding centers on **browsing modes** (Focus / Research / Unwind) with optional custom path; removed legacy “sites” step
  - Quick start (Focus), done-step handoff, localized wizard progress, and prefill when running setup again
  - Wizard polish: setup review card, Reddit try-it handoff, topic/mode validation, filter previews, setup-again prefill, Enter to continue
- **Dashboard UX**
  - Tab intros, activity stats, and quick links on Overview; localized system status
  - Plugins: section descriptions, enabled counts, neutral badges, optional install collapsed, enable-all site hints
  - Rules keyword summary; authenticity open-panel button; developer tools in collapsible Privacy section
  - Overview **Getting started** card; debug tools moved to Privacy; demo model-pack install UI removed
- **Filtering**
  - Safer default keyword lists (topic presets, not hostile-only builtins)
  - Word-boundary matching for short keywords; minimum text length before classification
- **Firefox QA**
  - Core profile now strips Hugging Face / ORT permissions from Firefox MV2 manifest
  - First-run onboarding wizard on Firefox install (parity with Chrome)
  - `browser_specific_settings.gecko.id` for AMO builds
  - `pnpm test:firefox` + manual checklist in `docs/guides/firefox-qa.md`
- **Distribution / store prep**
  - `pnpm release:chrome` and `pnpm release:firefox` — build, verify, zip to `releases/`
  - Store listing drafts, privacy policy, and release checklist under `store/`
  - GitHub Release workflow on `v*` tags
  - Guide: [`docs/guides/store-release.md`](docs/guides/store-release.md)
- **Authenticity v2**
  - T1 local checkworthiness ranking before search/LLM tiers
  - Full-page scope via universal scanner + DOM fallback (`PageContext`)
  - Side panel scope picker (selection vs full page) with dense-site warning
  - Settings: T1 toggle and allow full-page scope
- **Phase 11 — Content-type detector mods**
  - Optional `detector-noise-patterns` mod (promo, outrage bait, engagement bait)
  - Provider router merges supplementary detectors with primary results
  - Focus and Unwind browsing modes enable the noise-pattern detector; Research does not
- **Phase 10 — Browsing modes**
  - Built-in Focus, Research, and Unwind modes (one tap updates threshold, keywords, filter style, hint mods)
  - Popup and dashboard mode switchers; `activeBrowsingModeId` in storage
  - Content script rescans when mode settings change
- **Phase 9 — Operational hardening**
  - GitHub Actions CI: scanner unit tests, typecheck, core + acceptance E2E, perf regression snapshot
  - Anchor-attribute fingerprint stability (`collectAnchorKey`) for SPA/DOM host swaps
  - Reddit acceptance fixture with `shreddit-comment` anchor attributes
  - `test:ci` script for local CI parity
- Popup UI: Language Pack selector panel (auto-select + manual override persisted as `preferredPackId`).
- Firefox MV2 build pipeline:
  - `pnpm dev:firefox`
  - `pnpm build:firefox`
  - `vite.config.firefox.ts` (custom manifest emission; CRXJS is MV3-only)
- Documentation: `docs/guides/firefox-build.md`.

### Changed
- Fingerprints prefer semantic anchor attributes over volatile structural `id` values when inner DOM is replaced.
- Firefox MV2 manifest now points at built JS entry points (`src/background-firefox.js`, `src/content.js`).

### Removed
- Unused `src/incremental-scanner.ts` (superseded by universal scanner coordinator).

### Fixed
- Popup language detection now has a content-script handler (`detectLanguage`).
- Runtime pack selection reads `preferredPackId` on initialization (Chrome offscreen + Firefox background runtime).

## [2.0.0] - 2026-02-01

### Added

#### Core Architecture
- **Adapter-first content extraction**: Site-specific adapters replace generic DOM walking for better performance and accuracy
- **Site Adapter Interface**: Standardized interface with `getBlocks()`, `observeChanges()`, `applyEnforcement()`, `revealBlock()`, and `destroy()` methods
- **Runtime Host Abstraction**: Cross-browser compatible inference runtime supporting Chrome (offscreen document) and Firefox (persistent background)

#### Site Adapters
- **Reddit Adapter**: Full support for posts and comments with shreddit (new Reddit) and legacy Reddit selectors
- **YouTube Adapter**: Comment classification with `ytd-comment-renderer` targeting and permalink-based stable IDs
- **Quora Adapter**: Answer and comment targeting with multiple content selectors
- **Generic Fallback Adapter**: Heuristic-based content extraction for unknown sites with navigation/UI filtering

#### Performance Features
- **IntersectionObserver Integration**: Visible-first classification priority (70/30 visible/hidden batch ratio)
- **Performance Metrics Tracking**: Real-time metrics including time-to-first-classification, throughput, average batch time, and queue depths
- **MutationObserver Debouncing**: 500ms debounced batch processing to avoid jank
- **WebGPU Acceleration**: Automatic WebGPU detection with graceful WASM fallback

#### Navigation/UI Filtering
- Enhanced `shouldSkipElement()` heuristics to skip:
  - Navigation elements (`nav`, `header`, `footer`, `aside`)
  - ARIA landmarks (`role="navigation"`, `role="banner"`)
  - Interactive elements (buttons, forms, inputs)
  - UI labels (short text < 8 words, all-caps text)
  - Code blocks and documentation sections

#### Language Pack System (M3)
- **Language Pack Manager**: Automatic model pack selection based on page language detection
- **Language Detection**: HTML lang attribute, meta tags, and character-based heuristics (CJK, Arabic, Hebrew, Cyrillic, Thai, Devanagari)
- **Multilingual Fallback**: Automatic fallback to multilingual XLM-R model when language-specific packs unavailable
- **Pack Registry**: Scans and caches available model packs at extension startup

#### Policy System
- **Policy Presets**: Conservative, Balanced, and Strict moderation modes
- **Per-Label Thresholds**: Configurable toxicity thresholds per content type
- **Threshold Enforcement**: Score-based enforcement with policy-derived thresholds

#### UI/UX
- **Popup Performance Panel**: Real-time performance metrics display in debug panel
- **Blocked Items Debug Panel**: Shows recent blocked items with label, score, timestamp, and preview
- **Click-to-Reveal**: Users can click blurred content to reveal it
- **Runtime Status Display**: Shows runtime state, active model pack, and session status

#### Firefox Support
- **Firefox Background Runtime**: Direct ONNX inference in background script (no offscreen documents)
- **Manifest V2 Support**: Firefox-compatible extension manifest
- **Persistent Background Context**: Maintains model cache across page navigations

#### Developer Experience
- **Type Safety**: Full TypeScript with strict type checking
- **Model Pack Types**: Shared `ModelPack`, `ModelPackArtifacts`, and `ModelLabel` interfaces
- **IPC Type Safety**: `DetoxIpc` message type definitions for cross-component communication

### Changed
- Content script refactored from generic DOM scanner to adapter-based architecture
- Batch processing now prioritizes visible content before hidden content
- Model loading moved from content scripts to dedicated runtime hosts

### Fixed
- CSP (Content Security Policy) restrictions bypassed via offscreen document (Chrome) and background script (Firefox)
- Model download failures eliminated by bundling model packs with extension
- Memory leaks prevented via proper MutationObserver cleanup and LRU caches

### Technical Details
- **ONNX Runtime Web**: v1.14.0 for cross-platform inference
- **Transformers.js**: Tokenization via Xenova Transformers
- **Bundle Size**: WASM files externalized to `public/ort/` directory

## [1.0.0] - 2025-12-01

### Added
- Initial release with basic toxicity classification
- Generic DOM text node scanning
- Simple blur enforcement
- Chrome extension support only

[Unreleased]: https://github.com/detox-ai/extension/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/detox-ai/extension/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/detox-ai/extension/releases/tag/v1.0.0
