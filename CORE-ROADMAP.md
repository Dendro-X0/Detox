# Core Module Roadmap (Working Document)

> **Status:** Phases 1–6 complete · **Phase 7 (Universal Scanner) complete** · **Phase 8 (Consolidation) complete** · **Phase 9 (Operational hardening) complete** · **Phase 10 (Browsing modes) complete**  
> **Scanner spec:** [`docs/planning/universal-scanner-roadmap.md`](docs/planning/universal-scanner-roadmap.md)  
> **Product phases:** [`docs/planning/product-roadmap.md`](docs/planning/product-roadmap.md)  
> **Doc index:** [`docs/README.md`](docs/README.md)

## Product value

**Your time and energy are precious; do not let valueless content across the internet steal your focus and time.**

The core module provides a reliable runtime for **discovering content units**, classifying them through pluggable providers, and applying user-defined policies. **Phase 7 shipped universal discovery.** Phase 8 collapses legacy dual paths.

## Architecture (current → target)

**Today (broken discovery path):**

```
SiteAdapter (Reddit / YouTube / generic) → ContentBlock[] → ClassificationPipeline
```

**Target (Phase 7 — shipped):**

```
UniversalScanner → ContentUnit[] → ClassificationPipeline
Site hints (optional mods) ──boost/ignore──► Scanner
```

```
src/core/scanner/   — universal discovery (Phase 7)
src/core/           — pipeline, IPC, runtime host, registries
src/mods/detectors/ — pluggable detector providers
src/mods/actions/   — pluggable enforcement actions
src/site-adapters/  — legacy; frozen until scanner S4 passes
```

### Core owns

- **Universal content discovery** (Phase 7 — new)
- Pipeline orchestration (queue, batch, cache, backpressure)
- Policy engine (thresholds, presets, per-site overrides)
- Runtime host abstraction (Chrome offscreen / Firefox background)
- IPC protocol (task-neutral messages)
- Registries (detectors, providers, actions)

### Mods own (out of core)

- ~~Site adapters as primary discovery~~ → **optional site hints** (Phase 7 S5)
- Detector packs (heuristic, local-pack, remote-api, …)
- API providers (remote inference)
- Enforcement actions (blur, dim, collapse)

---

## Phases 1–6 (complete)

### Phase 1 — Neutralize the pipeline ✅

- [x] Task-neutral types, pipeline extraction, adapter vocabulary

### Phase 2 — Split runtime from detectors ✅

- [x] Offscreen host, heuristic + ONNX in mods

### Phase 3 — Provider routing ✅

- [x] Heuristic default, optional local-pack / remote-api

### Phase 4 — Action registry ✅

- [x] Pluggable dim / blur / collapse

### Phase 5 — Mod loading ✅

- [x] Core vs full build profiles, mod manifest

### Phase 6 — Slim default build ✅

- [x] Heuristic + generic adapter + dim in core build

**Done when (Phases 1–6):** Modular runtime ships; classification and enforcement work **when blocks are supplied**.

---

## Phase 7 — Universal scanner ✅ (complete)

**Full spec:** [`docs/planning/universal-scanner-roadmap.md`](docs/planning/universal-scanner-roadmap.md)

| Sub-phase | Goal | Status |
|-----------|------|--------|
| **S0** | Fixtures + invariants | ✅ |
| **S1** | Pure `UniversalScanner` + unit tests | ✅ |
| **S2** | Diff + coordinator (stable rescans) | ✅ |
| **S3** | Wire to `ClassificationPipeline` | ✅ |
| **S4** | Acceptance: fixtures + Reddit/scroll/SPA | ✅ |
| **S5** | Optional site hints (not required) | ✅ |

### Done when (Phase 7) ✅

1. S0–S4 complete; E2E filtering passes via universal scanner
2. Reddit thread scanned within ±15% of loaded units; no runaway (CI snapshot)
3. Site adapters not required in default content script path
4. Legacy adapters remain behind flag until Phase 8 removal

---

## Phase 8 — Core consolidation ✅ (complete)

**Goal:** One discovery path, one unit type, enforcement in core — easier to develop and extend.

| Step | Goal | Status |
|------|------|--------|
| **8.1** | Scanner sign-off + CI snapshots + expand triggers | ✅ |
| **8.2** | `ContentUnit` end-to-end; move enforcement to core | ✅ |
| **8.3** | Remove adapter discovery path; hint-only site mods | ✅ |
| **8.4** | Test & perf harness (Phase H remainder) | ✅ |
| **8.5** | Neutral naming & IPC cleanup | ✅ |

### Done when (Phase 8)

1. `ClassificationPipeline` accepts `ContentUnit` directly (no `ContentBlock` bridge)
2. No `SiteAdapter` in content script hot path
3. Mod kinds: detectors, actions, hints (not discovery adapters)
4. `VITE_USE_UNIVERSAL_SCANNER` flag removed ✅
5. Core v0.3 checklist green ✅

---

## Phase 9 — Operational hardening ✅ (complete)

**Goal:** CI coverage, stable anchor fingerprints, realistic fixtures, dead-code cleanup.

| Step | Goal | Status |
|------|------|--------|
| **9.1** | GitHub Actions CI (unit, E2E, perf) | ✅ |
| **9.2** | Reddit acceptance fixture with site-like anchor attrs | ✅ |
| **9.3** | Anchor-attribute fingerprint stability | ✅ |
| **9.4** | Dead code removal (`incremental-scanner.ts`) | ✅ |

### Done when (Phase 9)

1. `pnpm test:scanner` green (66 tests) ✅
2. CI runs typecheck, scanner unit, core + acceptance E2E, perf snapshot ✅
3. Fingerprints stable when inner DOM host swaps but semantic anchor shell persists ✅
4. Reddit fixture uses `shreddit-comment` anchor attributes ✅

---

## Core v0.4 definition of done (Phase 9) ✅

1. CI workflow on push/PR ✅
2. Anchor-based fingerprint fallback for SPA/DOM churn ✅
3. Acceptance fixtures aligned with real site markup ✅

---

## Phase 10 — Browsing modes ✅ (complete)

**Goal:** One-tap presets that swap threshold, keywords, filter style, and hint mods.

| Step | Goal | Status |
|------|------|--------|
| **10.1** | Mode definitions + `applyBrowsingMode` | ✅ |
| **10.2** | Popup mode switcher | ✅ |
| **10.3** | Dashboard modes panel | ✅ |
| **10.4** | Content script rescan on mode change | ✅ |

### Done when (Phase 10)

1. Three built-in modes apply bundled settings atomically ✅
2. Allow keywords/domains preserved across mode switches ✅
3. Manual edits clear `activeBrowsingModeId` (custom) ✅
4. Unit tests for mode patches ✅

---

## Phase 11 — Content-type detector mods ✅ (complete)

**Goal:** Optional detector mods for promos and bait, merged with the primary classifier.

| Step | Goal | Status |
|------|------|--------|
| **11.1** | `detector-noise-patterns` mod + provider | ✅ |
| **11.2** | Supplementary merge in `ProviderRouter` | ✅ |
| **11.3** | Browsing modes enable/disable detector | ✅ |

---

## Phase 7 archive — universal scanner (superseded)

<details>
<summary>Original Phase 7 checklist (historical)</summary>

Site adapters failed as the discovery layer. Phase 7 moved discovery into core.

| Sub-phase | Goal | Status |
|-----------|------|--------|
| **S0** | Fixtures + invariants | ✅ |
| **S1** | Pure `UniversalScanner` + unit tests | ✅ |
| **S2** | Diff + coordinator (stable rescans) | ✅ |
| **S3** | Wire to `ClassificationPipeline` | ✅ |
| **S4** | Acceptance: fixtures + Reddit/scroll/SPA | ✅ |
| **S5** | Optional site hints (not required) | ✅ |

</details>

---

## Core v0.1 definition of done ✅ (superseded for discovery)

Phases 1–6 criteria met for **classification runtime**. Product v0.1 shipped with adapter-based discovery.

## Core v0.2 definition of done (Phase 7) ✅

1. Universal scanner passes all fixture tests (S1) ✅
2. Pipeline fed by scanner, not primary adapters (S3) ✅
3. Acceptance scenarios pass (S4) ✅
4. Loads with no model files; heuristic provider unchanged ✅
5. Task-neutral types end-to-end ✅
6. ML deps lazy unless local pack active ✅

## Core v0.3 definition of done (Phase 8) ✅

1. Single discovery path through `ContentUnit` ✅
2. Core-owned enforcement (no adapter bridge) ✅
3. Legacy adapter discovery removed ✅
4. Perf + pipeline unit tests in CI ✅
5. Neutral naming in hot path ✅

---

## Stable extension interfaces

| Interface | Role | Phase 8 note |
|-----------|------|------------|
| `ContentUnit` / scanner output | Discovery contract | **Primary** |
| `ClassificationPipeline` | Queue, classify, enforce | Unchanged |
| `Detector` / `InferenceProvider` | Batch classify → `Verdict[]` | Unchanged |
| `EnforcementAction` | Visual treatment | Unchanged |
| Site hint packs | Optional precision tuning | Mod kind: `hint` |

### Future interfaces (Track 2)

| Interface | Role |
|-----------|------|
| `PageAnalyzer` | Authenticity scope |
| `RetrievalProvider` | Search / fact-check |
| `AuthenticityAnalyzer` | Advisory reports |

Spec: [`docs/experimental/authenticity-analysis.md`](docs/experimental/authenticity-analysis.md)

---

## Notes

- Seed walker: [`src/scanner.ts`](src/scanner.ts)
- Enforcement DOM markers use `data-sl-*` dataset keys (`ENFORCEMENT_DATASET`).
- **Product Phase I + Phase 8** — see [`docs/planning/product-roadmap.md`](docs/planning/product-roadmap.md).
