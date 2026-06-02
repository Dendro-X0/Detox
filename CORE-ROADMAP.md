# Core Module Roadmap (Working Document)

> Delete this file once all phases below are complete and verified.

## Product value

**Your time and energy are precious; do not let valueless content across the internet steal your focus and time.**

- Browse the internet with more focus and purpose.
- Browse the web exactly the way you prefer.

The core module does not define what “noise” means. It provides a reliable runtime for extracting content blocks, classifying them through pluggable providers, and applying user-defined policies.

## Architecture

```
src/core/           — pipeline, IPC, runtime host, provider + action registries
src/mods/detectors/ — pluggable detector providers
src/mods/actions/   — pluggable enforcement actions (blur, dim, collapse)
```

### Core owns

- Pipeline orchestration (queue, batch, cache, backpressure)
- Policy engine (thresholds, presets, per-site overrides)
- Runtime host abstraction (Chrome offscreen / Firefox background)
- IPC protocol (task-neutral messages)
- Registries (adapters, detectors, providers, actions — interfaces first)

### Mods own (out of core)

- Site adapters (Reddit, YouTube, …)
- Detector packs (relevance, spam, toxicity, …)
- API providers (remote inference)
- Enforcement actions (blur, dim, collapse)
- Reading-mode presets

## Phases

### Phase 1 — Neutralize the pipeline ✅ (complete)

- [x] Roadmap document
- [x] Task-neutral types (`Verdict`, `Policy`, IPC messages)
- [x] Extract pipeline + policy from `content.ts` into `src/core/`
- [x] Update adapters and runtime to use `matched` / `labelId` / `detectorId`
- [x] Keep existing behavior working via compatibility shims

**Done when:** Extension runs with refactored core; IPC and adapters use neutral vocabulary.

### Phase 2 — Split runtime from detectors ✅ (complete)

- [x] Extract offscreen host (`InferenceRuntimeHost` + provider dispatch)
- [x] Move ONNX logic to `src/mods/detectors/onnx-pack/`
- [x] Move heuristic logic to `src/mods/detectors/heuristic-keywords/`
- [x] Core calls `activeProvider.classifyBatch()` via provider registry

**Done when:** Swapping detector = config change + mod folder, no core edits.

### Phase 3 — Provider routing ✅ (complete)

- [x] Heuristic provider in mods; default fallback via `ProviderRouter`
- [x] `local-pack` provider mod (canonical ONNX id; `onnx-pack` kept as legacy alias)
- [x] `remote-api` provider mod (stub-compatible POST endpoint)
- [x] Opt-in uncertainty-based API escalation (`escalationEnabled` + margin)
- [x] Default primary mode: **heuristic** (zero model weights required)

**Done when:** Core works with zero model weights via heuristic provider.

### Phase 4 — Action registry ✅ (complete)

- [x] Pluggable `EnforcementAction` interface (`blur`, `dim`, `collapse`)
- [x] Action registry + settings in `chrome.storage.local`
- [x] Site adapters delegate to `applyEnforcementToElement` / `revealBlockedContent`
- [x] Popup UI to switch filter style

**Done when:** New visual treatment ships as a mod without pipeline changes.

### Phase 5 — Mod loading ✅ (complete)

- [x] Build profiles: `core` (default) and `full` via `VITE_BUILD_PROFILE`
- [x] `pnpm build:core` / `pnpm build:full` scripts
- [x] Mod manifest catalog (`src/mods/mod-manifest.ts`)
- [x] Build-time `import.meta.env.VITE_BUILD_PROFILE` gating strips full-only JS chunks from core output
- [x] Core build strips `model-packs/` and `ort/` from output + manifest
- [ ] Signed mod install flow (deferred)

**Done when:** Default build excludes heavy model packs and site adapters.

### Phase 6 — Slim default build ✅ (complete)

- [x] Core ships generic adapter + heuristic detector + dim action only
- [x] Default filter style: **dim** (was blur)
- [x] Blur/collapse actions and remote-api detector gated to full build
- [x] Runtime lazy-load of ONNX providers via `ensureOnnxProvidersLoaded()` when local pack selected
- [x] Core build excludes `backend-benchmark` page (~1 MB Transformers chunk)
- [x] Core routing migration clamps local-pack / escalation settings to heuristic-only

**Done when:** Base extension is a few MB; full stack is opt-in.

## Core v0.1 definition of done

1. Loads with **no model files** and classifies via heuristic provider
2. Swapping detector = setting + mod enable (after Phase 2–3)
3. Adding a site = adapter mod, no core edits
4. IPC and adapters use **task-neutral** types
5. ML deps not imported unless local pack mod active ✅
6. Policy dims blocks where `score >= threshold` regardless of label semantics

## Stable extension interfaces (target)

| Interface | Role |
|---|---|
| `SiteAdapter` | Extract blocks, apply enforcement |
| `Detector` | Batch classify → `Verdict[]` |
| `InferenceProvider` | Local or remote backend routing |
| `EnforcementAction` | Visual treatment for matched blocks |

## Notes

- Project rename TBD; codebase may still use legacy `detox` prefixes during migration.
- Repository remains private until core v0.1 is stable.
