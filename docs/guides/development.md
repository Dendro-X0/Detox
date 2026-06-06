# Development guide

Local setup, build profiles, and how to load the extension during development.

→ Firefox-specific details: [`firefox-build.md`](./firefox-build.md)  
→ Doc hub: [`../README.md`](../README.md)

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** (`npm install -g pnpm` or enable via Corepack)
- **Chrome** or **Chromium** for primary MV3 development
- **Firefox** (optional) for MV2 parity testing

## Quick start (core profile)

The **core** profile is the default — heuristic filtering, generic site adapter, dim action. No ONNX model files required.

```bash
pnpm install
pnpm build          # outputs to ./dist
```

**Load in Chrome**

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `./dist`

**Smoke test**

| Surface | URL / action |
|---------|----------------|
| Popup | Click toolbar icon |
| Options dashboard | Extension → Details → Extension options, or open `dist/options.html` |
| Onboarding wizard | `options.html?wizard=1` or clear `onboardingComplete` in storage |
| Authenticity side panel | Enable in Options → Plugins tab; right-click selected text → analyze |

## Build profiles

| Command | Profile | Output | Contents |
|---------|---------|--------|----------|
| `pnpm build` | **core** | `./dist` | Heuristic detector, generic adapter, dim |
| `pnpm build:full` | **full** | `./dist` | + site adapters, blur/collapse, ONNX local pack |
| `pnpm build:firefox` | **core** | `./dist-firefox` | Firefox MV2 build |
| `pnpm build:full:firefox` | **full** | `./dist-firefox` | Full profile for Firefox |

Dev servers (hot reload):

```bash
pnpm dev              # Chrome MV3, core
pnpm dev:full         # Chrome MV3, full
pnpm dev:firefox      # Firefox MV2, core
pnpm dev:firefox:full # Firefox MV2, full
```

## Full profile: model packs

Full builds include an optional ONNX toxicity pack. Large artifacts are **gitignored** — fetch locally before `pnpm build:full`:

```bash
pnpm fetch:modelpack   # PowerShell script; downloads into public/model-packs/
pnpm prepare:ort       # ONNX Runtime WASM (required for full build)
pnpm build:full
```

If `fetch:modelpack` fails on non-Windows, download manually into `public/model-packs/toxicity-multi-xlm-r/` — see [`../../README.md`](../../README.md#-model-packs) for file list and Hugging Face URLs.

## Project layout (developer map)

```
src/
├── core/                 Pipeline, IPC, storage, mod enablement
├── mods/                 Detectors, actions, analyzers (authenticity)
├── site-adapters/        Reddit, YouTube, Quora, generic
├── dashboard/            Options UI, wizard shell, settings panels
├── background*.ts        Chrome SW / Firefox background page
├── content.ts            Content script
├── options-main.tsx      Options page entry
└── manifest.json         Chrome MV3 manifest (Firefox: manifest-firefox.json)

dist/                     Chrome build output
dist-firefox/             Firefox build output
packages/mod-unlocks/     Example signed mod packages
scripts/                  fetch-model-pack, sign-mod-package, spikes
docs/                     Documentation (start at docs/README.md)
```

## Extension surfaces

| File | Purpose |
|------|---------|
| `index.html` | Popup (compact toggle + stats) |
| `options.html` | Full settings dashboard (tabbed) |
| `sidepanel.html` | Authenticity analysis report |
| `offscreen.html` | ONNX inference host (Chrome full build) |

Options dashboard tabs (hash routing): `#overview`, `#filtering`, `#rules`, `#plugins`, `#privacy`.

## Testing authenticity assist

1. Build and reload extension.
2. Options → **Plugins** → enable **Authenticity assist** settings.
3. Configure search provider (Wikipedia works without API key for demos).
4. Optional T3: set OpenAI-compatible chat URL + API key; model list auto-loads.
5. Select text on a page → context menu **Analyze selection with SignalLens**.
6. Side panel opens with advisory report (never auto-hides page content).

Spike script (latency probe, no extension required):

```bash
node scripts/authenticity-spike.mjs
```

## Signed mod packages

Install test packages from the Options → Plugins tab, or sign your own:

```bash
node scripts/sign-mod-package.mjs --help
```

Dev signing key lives in `packages/signing/` (rotate before any public release).

## Lint and tests

```bash
pnpm lint
pnpm test:scanner:s0 # universal scanner fixtures (S0 — should pass)
pnpm test:scanner    # full scanner suite (S1 tests fail until implemented)
pnpm test:e2e:core   # build + Playwright core filtering tests (requires Chromium)
pnpm test:e2e       # all Playwright tests
pnpm test:perf      # Performance regression subset
```

### Core filtering E2E

`tests/core-filtering.spec.ts` loads the built extension in Chromium and verifies:

- Keyword rules **dim** matching paragraphs on a fixture page
- **Allow keywords** bypass blocking
- **Focus off** disables enforcement
- **Click-to-reveal** restores dimmed content
- **Stats** (`scanned` / `toxic`) update in storage

Requires **Google Chrome** installed (Playwright `channel: 'chrome'`) and a built extension (`pnpm build`). First run may prompt browser permissions because tests launch a headed browser with the unpacked extension loaded.

## Common issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Runtime `error`, missing `model.onnx` | Full build without model pack | Run `pnpm fetch:modelpack` or use `pnpm build` (core) |
| Runtime `error`, offscreen / storage | Stale build or session API mismatch | Rebuild; core profile uses inline background runtime (no offscreen) |
| Options page layout stale | Extension page cache | Hard refresh (`Ctrl+Shift+R`) on options tab |
| Authenticity models list empty | Invalid URL/key or CORS | Check endpoint; use Refresh on model selector |
| Firefox sidebar vs side panel | MV2 uses `sidebar_action` | See [`firefox-build.md`](./firefox-build.md) |

## Related docs

| Doc | Topic |
|-----|-------|
| [`firefox-build.md`](./firefox-build.md) | Firefox MV2 strategy and load steps |
| [`../planning/product-roadmap.md`](../planning/product-roadmap.md) | Product phases A–G |
| [`../experimental/authenticity-analysis.md`](../experimental/authenticity-analysis.md) | Authenticity design spec |
