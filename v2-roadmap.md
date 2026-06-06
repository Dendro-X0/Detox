# Detox AI v2 – Goals & Design Specification

> **Planning status:** Technical implementation complete (see [`CORE-ROADMAP.md`](./CORE-ROADMAP.md)).  
> **Forward product work:** [`docs/planning/product-roadmap.md`](docs/planning/product-roadmap.md).  
> **Experimental features:** [`docs/experimental/`](docs/experimental/).  
> This document remains as **historical design context** for v2 decisions.

## 1) Purpose
Detox AI v2 is a browser extension for filtering user-visible content (e.g. Reddit posts/comments) using on-device detectors (small local models by default). It is OSS-first and designed for community-maintained extensibility.

## 2) Primary Goals
- **Reliability**
  - No runtime dependency on third-party model hosting.
  - Deterministic startup and inference across hostile CSP sites.
  - Graceful degradation (model unavailable, low resources).
- **Privacy / Offline-first**
  - Default: user content never leaves the device.
  - Optional remote inference requires explicit opt-in and clear UI.
- **Performance (Desktop + Mobile-class devices)**
  - Avoid page jank and long tasks.
  - Bounded CPU usage via batching, caching, and backpressure.
  - Prefer small model packs by default.
- **Extensibility**
  - Community can add:
    - detectors (toxicity, spam, misinformation, etc.)
    - model packs (languages, domains)
    - site adapters (Reddit, YouTube, generic)
    - policies (thresholds, allowlists)
- **Cross-browser support**
  - Chrome/Chromium first.
  - Firefox supported via a compatible runtime host abstraction.

## 3) Non-Goals (v2)
- Perfect universal DOM support for every site (use adapters + fallback).
- Large LLM chat-style moderation in-browser (out of scope for v2 defaults).
- Silent remote inference (must be explicit).

## 4) Key Design Decisions
- **Decision A**: v2 ships with **bundled model packs only** by default (no Hugging Face runtime downloads).
- Inference runs in a **dedicated runtime host** (not in content scripts).
- Scanning is **adapter-first** (content blocks), not “walk every text node”.

## 5) Architecture Overview

### 5.1 Components
- **Content Script (per tab)**
  - Uses a site adapter to extract *content blocks*.
  - Sends batches of blocks to the core pipeline.
  - Applies enforcement (blur/hide/replace) using stable node IDs.
  - Provides user interactions (reveal once, allowlist).

- **Control Plane (background)**
  - Owns settings, policies, and orchestration.
  - Maintains queues and backpressure.
  - Routes work to the inference runtime host.

- **Inference Runtime Host (data plane)**
  - Loads model packs and runs detectors.
  - Maintains in-memory caches.
  - Persists caches (IndexedDB) where supported.

### 5.2 Chrome vs Firefox runtime hosts
Because browser extension capabilities differ, v2 uses a runtime host abstraction:
- **Chrome host**: MV3 + **offscreen document** (preferred for persistent inference context).
- **Firefox host**: a **persistent background context** (MV2 background page or MV3 equivalent where supported).

Core requirement: detectors must not assume the host type; they talk to an abstract host API.

### 5.3 Data flow (high level)
1. Content script detects/updates content blocks (adapter + observers).
2. Content script sends a batch `classifyBatch` request.
3. Background control plane enqueues and forwards to runtime host.
4. Runtime host runs detectors and returns verdicts.
5. Content script applies policy actions (blur/hide/etc.) and updates UI counters.

## 6) Extension Points (OSS Scalability)

### 6.1 Site Adapters
A site adapter defines:
- how to locate content blocks (comments/posts/messages)
- how to derive stable IDs
- how to apply enforcement safely (minimal layout shifts)
- how to observe SPA navigation and content updates

**Fallback adapter** exists for unknown sites but is not the default path for performance.

### 6.2 Detectors
A detector provides:
- supported labels (e.g. `toxic`, `insult`, `threat`, `spam`)
- a batch classify method
- declared constraints (max chars, languages, runtime requirement)

Detectors must:
- support batching
- be deterministic for a given model pack version

### 6.3 Policies
Policies decide:
- thresholds per label
- per-site overrides
- allowlists/denylists (author, community, keywords)
- action type: blur, hide, replace, dim

## 7) Model Pack Specification (v2)
A model pack is a versioned artifact included with the extension build.

### 7.1 Required files
- `modelpack.json`
- model artifacts (backend-dependent)
- optional tokenizer/config artifacts

### 7.2 `modelpack.json` (conceptual schema)
- `id`: string
- `name`: string
- `version`: string
- `license`: string
- `languages`: string[]
- `task`: string
- `backend`: `onnx-runtime-web | transformers-js | custom`
- `labels`: `{ id: string; displayName: string }[]`
- `constraints`: `{ maxChars: number }`
- `defaults`: `{ thresholds: Record<string, number> }`

## 8) Performance Design Patterns
- **Incremental scanning**
  - MutationObserver queues new/changed blocks.
  - IntersectionObserver prioritizes visible blocks.
- **Batching**
  - classify in batches (target 16–64 blocks depending on device).
- **Caching**
  - hash(text) → verdict cache (LRU in memory + IndexedDB where possible).
- **Backpressure**
  - drop/skip low-priority blocks when queue grows.
  - avoid flooding message channels.
- **Fail fast**
  - model initialization is single-flight; additional requests wait on the same promise.

## 9) UX Requirements
- Clear model state:
  - initializing / ready / error
- Clear privacy mode:
  - local-only (default)
  - remote provider (explicit)
- Per-action controls:
  - reveal once
  - allowlist author/community
  - adjust thresholds per detector

## 10) Security & Trust
- Bundled model packs must include license metadata.
- Provide a build-time integrity manifest (hashes) for packs.
- Remote inference (if enabled) must:
  - be opt-in
  - document what is sent
  - support endpoint allowlisting

## 11) Repository Organization (target)
- `src/core/` control plane, storage, policies, message types
- `src/runtime/` inference host + caching + batching
- `src/site-adapters/` site-specific extraction/enforcement
- `src/detectors/` detector interfaces + built-in detectors
- `src/model-packs/` bundled packs + manifests
- `src/ui/` popup/options/model manager
- `dcos/` (repo-required)

## 12) Iteration Roadmap (Single Source of Truth)

This section is the actionable roadmap for iterating Detox AI v2. It is the single source of truth for planned work and milestones.

### 12.1 Current baseline (what works today)
- Chrome MV3 offscreen runtime for inference (persistent-ish model host).
- ONNX Runtime Web with packaged WASM backend.
- Model packs stored under `public/model-packs/*` (downloaded locally as release assets).
- Batch IPC (`classifyBatch`) from content script → background → offscreen runtime.
- Enforcement: blur + click-to-reveal.
- Stability improvements:
  - multi-label logits handling (sigmoid per label)
  - skip code blocks (`<pre>`, `<code>`)
  - per-page queue + caching + navigation reset
  - English-first gating to reduce multilingual false positives

### 12.2 Guiding principles
- Privacy first: default must not send user content off-device.
- No jank: avoid long tasks in content scripts; pace work with backpressure.
- Adapter-first: scan content blocks, not the entire DOM.
- Deterministic debugging: always provide actionable runtime status and error reasons.
- Composable modules: detector, pack, adapter, and policy boundaries should be stable.

### 12.3 Milestone 0 — UX hardening (immediate)
Goal: make the extension feel responsive and predictable on modern SPA websites.

0.1 Progress + transparency ✅
- Show progress in popup:
  - items queued / classified / blocked
  - current batch size + rate
  - runtime state (ready/loading/error)
- Last blocked items (debug mode): ✅
  - score + label
  - safe preview (first N chars) optional
  - element tag + page hostname

0.2 Navigation experience ✅
- Detect SPA navigation reliably.
- Reset per-page stats and queues cleanly.
- Avoid scanning UI chrome and duplicated nodes.

0.3 Performance budget 🔄
- Target: no noticeable input lag while scrolling.
- Target: time-to-first-classification < 1–3s after navigation on typical pages.
- Backpressure: if queue grows too large, prioritize visible content and skip low value nodes. ✅

### 12.4 Milestone 1 — Accuracy improvements without heavy customization
Goal: reduce false positives/negatives while keeping the system generic.

1.1 Policies and thresholds ✅
- Per-label thresholds (global defaults).
- Per-site override for thresholds.
- Safe mode presets:
  - Conservative: fewer blocks
  - Balanced
  - Strict

1.2 Block decision refinement 🔄
- Separate classification score from enforcement decision. ✅
- Add heuristics for common false-positive domains:
  - code/docs sites ✅
  - navigation menus
  - UI labels

1.3 Observability-driven tuning ✅
- Debug signals to understand why an item was blocked:
  - which label triggered
  - score
  - text length
  - language gate outcome

### 12.5 Milestone 2 — Scalability (adapters + incremental scanning)
Goal: support more websites smoothly with limited per-site code.

 2.1 Incremental scanning engine ✅
 - MutationObserver for new content blocks (not for navigation detection).
 - IntersectionObserver: visible-first classification. ✅
 - Stable IDs per block.

2.2 Adapter-first extraction ✅
- Introduce a site-adapter interface:
  - `getBlocks()`
  - `observeChanges()`
  - `applyEnforcement()`
  - `getStableId()`
 - Provide adapters:
  - Reddit (first) ✅
  - YouTube comments ✅
  - Quora answers ✅
 - Provide a generic fallback adapter. ✅

### 12.6 Milestone 3 — Language packs (English-first default)
Goal: default experience is high precision; other languages are opt-in.

- Default pack: English.
- Optional packs: French, Spanish, Chinese.
- UI for pack selection ✅
- Optional pack install flow 🔄
- Language detection/gating strategy:
  - quick heuristic gate by default
  - optional compact language-id model later

### 12.7 Milestone 4 — Contextual and sentiment-aware moderation
Goal: fewer “unfriendly word used in a friendly way” false positives.

- Add context windows:
  - classify (text + parent context)
  - conversation-aware features (reply chain)
- Add sentiment and intent cues.
- Consider multi-stage pipeline:
  - fast first-pass filter
  - slower second-pass contextual evaluation

### 12.8 Engineering checklist (always)
- Add caps to any cache (LRU with max entries).
- Avoid unbounded storage growth.
- Prefer early returns and small functions.
- Keep public module boundaries typed and stable.

## 13) Milestones (legacy summary)

This section is a compact summary of earlier milestone naming. The detailed and current plan lives in **Section 12**.

### Milestone 1: v2 “Works on Reddit offline"
- Bundled toxicity model pack (small)
- Reddit adapter for posts + comments
- Batch + cache + backpressure
- Runtime host abstraction:
  - Chrome offscreen host
  - Firefox compatible host

### Milestone 2: Pack system + second detector
- Model pack loader + validation
- Add multilingual or spam detector pack
- Per-subreddit thresholds/allowlists

### Milestone 3: Mobile performance hardening
- Visible-first classification
- WebGPU acceleration where available ✅
- Perf regression tests + profiling harness ✅

## 14) Open Questions
- Preferred default backend for v2 (ONNX Runtime Web vs Transformers.js) given bundle size and browser support.
- Firefox target manifest strategy ✅ (MV2 background page for now; revisit MV3 when offscreen/service-worker constraints improve)

## 15) Future product plans
- Landing page for onboarding, privacy/tech explanation, and performance expectations.
- "Packs" platform (language and other detector models): catalog, versioning, signing, and a lightweight install/update UX.
