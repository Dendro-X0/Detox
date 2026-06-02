# Experimental features

Ideas under exploration. **Not scheduled for core** until spikes prove feasibility and fit product principles.

## Principles (all experimental work)

1. **Opt-in** — no silent full-page scans or background API calls.
2. **Advisory, not punitive** — flag and inform; never hide or block based on “truth” scores.
3. **Privacy-first** — local tiers by default; remote APIs require explicit user setup.
4. **Grounded outputs** — URLs and quotes come from retrieval, not model imagination.
5. **Cost-aware** — selection-first scope, tiered pipeline (T0–T3), quotas and caching.

## Features

| Feature | Status | Doc |
|---------|--------|-----|
| **Authenticity / claim assist** | Design spec complete; spikes not started | [`authenticity-analysis.md`](./authenticity-analysis.md) |

### Authenticity assist (summary)

- User **selects** a post, comment, or passage (default).
- Optional **full-page** analysis for blogs and papers only — discouraged on dense social feeds.
- **Tiered pipeline:** local heuristics → optional local model → search → LLM compare on fetched snippets only.
- **Grounded citations:** LLM never emits URLs; snippet verification required.
- **UI:** side panel report + dismissible advisory flag on selection.

Product phase: **G** in [`../product-roadmap.md`](../product-roadmap.md) (after dashboard + user rules).

## Adding a new experimental spec

1. Create `docs/experimental/<feature-name>.md` using authenticity doc as template.
2. Link from this README and from [`../product-roadmap.md`](../product-roadmap.md) experimental table.
3. State relationship to core (separate mod, shared adapters, etc.).
