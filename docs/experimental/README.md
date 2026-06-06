# Experimental features

Features that ship **separately from core filtering** — advisory-only, opt-in, and grounded in retrieval rather than auto-blocking.

→ Doc hub: [`../README.md`](../README.md) · Product phases: [`../planning/product-roadmap.md`](../planning/product-roadmap.md)

## Principles (all experimental work)

1. **Opt-in** — no silent full-page scans or background API calls.
2. **Advisory, not punitive** — flag and inform; never hide or block based on “truth” scores.
3. **Privacy-first** — local tiers by default; remote APIs require explicit user setup.
4. **Grounded outputs** — URLs and quotes come from retrieval, not model imagination.
5. **Cost-aware** — selection-first scope, tiered pipeline (T0–T3), quotas and caching.

## Features

| Feature | Status | Doc | Code |
|---------|--------|-----|------|
| **Authenticity / claim assist** | **Prototype shipped** (Phase G) | [`authenticity-analysis.md`](./authenticity-analysis.md) | `src/mods/analyzers/authenticity/` |

### Authenticity assist (summary)

- User **selects** a post, comment, or passage (context menu).
- **Tiered pipeline:** T0 local heuristics → T2 search → optional T3 LLM compare on fetched snippets only.
- **Grounded citations:** LLM never emits URLs; snippet verification required.
- **UI:** side panel report + settings in Options → Plugins tab.
- **Search-only default:** zero LLM tokens until user enables T3 and configures an endpoint.

Product phase **G** is complete. The feature remains **experimental** — API surfaces, quotas, and UX will evolve.

**Try it:** see [`../guides/development.md`](../guides/development.md#testing-authenticity-assist).

## Adding a new experimental spec

1. Create `docs/experimental/<feature-name>.md` using authenticity doc as template.
2. Link from this README and from [`../planning/product-roadmap.md`](../planning/product-roadmap.md).
3. State relationship to core (separate mod, shared adapters, etc.).
4. Implement under `src/mods/analyzers/` or a new mod kind — **do not** wire into filter enforcement.
