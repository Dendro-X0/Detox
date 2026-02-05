# Detox AI Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Popup UI: Language Pack selector panel (auto-select + manual override persisted as `preferredPackId`).
- Firefox MV2 build pipeline:
  - `pnpm dev:firefox`
  - `pnpm build:firefox`
  - `vite.config.firefox.ts` (custom manifest emission; CRXJS is MV3-only)
- Documentation: `docs/firefox-build.md`.

### Changed
- Firefox MV2 manifest now points at built JS entry points (`src/background-firefox.js`, `src/content.js`).

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
