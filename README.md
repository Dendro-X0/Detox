# SignalLens

**Version:** 2.4.0 · **Stage:** Unlisted dogfood RC → [v3.0.0 public launch](docs/planning/version-roadmap.md) ([Track C ops](docs/planning/v2.3-release-ops.md))

SignalLens is a browser extension that helps you browse with more focus by reducing low-value content using **your** rules — keywords, browsing modes, and site whitelists. Optional authenticity assist provides advisory source checks on text you select; it never auto-blocks content for “truth.”

Working name: **SignalLens**. Positioning: a modular, plugin-based personal browsing layer.

## What ships today (core build)

Default build (`pnpm build`) — recommended for daily use and first store listing:

| Capability | Details |
|------------|---------|
| **Discovery** | Universal scanner on any normal web page |
| **Filtering** | Heuristic keywords + optional noise-pattern detector |
| **Enforcement** | Dim (click to reveal) |
| **Modes** | Focus, Research, Unwind presets |
| **Setup** | Onboarding wizard (primary path); dashboard for fine-tuning |
| **Locales** | English + German UI templates |

Full build (`pnpm build:full`) adds ONNX local packs, blur/collapse, site hint mods — optional upgrade, not required for core filtering.

## Quick start

```bash
pnpm install
pnpm build          # → ./dist (core profile)
```

Load unpacked from `./dist` in `chrome://extensions`. First install opens the setup wizard.

```bash
pnpm test:core      # unit tests + core filtering E2E
pnpm release:verify # store package checks on ./dist
```

See **[`docs/guides/development.md`](docs/guides/development.md)** for Firefox, full profile, authenticity, and signed mods.

## Architecture (summary)

```
Universal scanner → classifyBatch → heuristic (+ optional noise patterns) → dim / reveal
```

- **Content script** — scans DOM, batches text, applies enforcement
- **Background** — routes `classifyBatch` to inline runtime (core) or offscreen ONNX (full)
- **Mods** — detectors, actions, analyzers, site hints; signed optional packages
- **Authenticity assist** — separate track; script-first public retrieval → AI cross-reference ([spec](docs/experimental/authenticity-analysis.md))

## Roadmap

| Milestone | Theme |
|-----------|--------|
| **v2.3.x** (now) | Unlisted dogfood RC → text-noise launch wedge |
| **v3.0.0** | Public release (Option A: excellent noise filter) |
| **v3.1+** | Preferences hub, interest diet, ≤1-min Express setup |
| **v3.2+** | Selection assist (search / verify / page tools) |

→ [`docs/planning/purposeful-browsing-roadmap.md`](docs/planning/purposeful-browsing-roadmap.md) · [`docs/planning/version-roadmap.md`](docs/planning/version-roadmap.md)

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/README.md`](docs/README.md) | Documentation hub |
| [`docs/guides/development.md`](docs/guides/development.md) | Local setup and testing |
| [`docs/guides/store-release.md`](docs/guides/store-release.md) | Chrome / Firefox store packaging |
| [`docs/guides/firefox-qa.md`](docs/guides/firefox-qa.md) | Firefox smoke matrix |
| [`docs/experimental/authenticity-analysis.md`](docs/experimental/authenticity-analysis.md) | Authenticity assist (experimental) |
| [`ROADMAP.md`](ROADMAP.md) | Repository roadmap index |

## Tech stack

TypeScript · React · Vite · Manifest V3 (Chrome) / MV2 (Firefox) · Vitest · Playwright
