# Firefox QA checklist

Manual and automated checks for **SignalLens** on Firefox MV2 before AMO submission.

→ Build/load: [`firefox-build.md`](./firefox-build.md)  
→ Store upload: [`store-release.md`](./store-release.md)

## Automated (run first)

```bash
pnpm test:firefox          # manifest + bundle structure tests
pnpm release:firefox       # build, verify, zip
```

`scripts/verify-store-build.mjs dist-firefox` validates:

- `background.scripts` and `content.js` exist in the zip output
- `sidebar_action` + `browser_action` present
- `browser_specific_settings.gecko.id` set
- No Hugging Face permissions in **core** profile
- No private keys in bundle

## Load temporary add-on

1. `pnpm build:firefox` (or `pnpm dev:firefox` for watch mode)
2. Firefox → `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `dist-firefox/manifest.json`

## Manual smoke matrix

| # | Area | Steps | Pass |
|---|------|-------|------|
| 1 | **Install** | Temporary add-on loads without console errors in background | ☐ |
| 2 | **First-run wizard** | Fresh profile → install opens `options.html?wizard=1`; complete wizard with **Start browsing** (no dashboard required); `onboardingComplete` + `enabled` set | ☐ |
| 3 | **Popup** | Toolbar icon → toggle Focus mode; browsing modes switch | ☐ |
| 4 | **Filtering** | Enable extension → open E2E fixture or page with block keywords → content dims | ☐ |
| 5 | **Reveal** | Click dimmed block → content restores | ☐ |
| 6 | **Options** | Extension options → Rules tab saves keywords | ☐ |
| 7 | **Browsing modes** | Overview tab → Focus / Research / Unwind updates settings | ☐ |
| 8 | **Stats** | Popup shows scanned/filtered counts after browsing | ☐ |
| 9 | **Authenticity off** | Default: no context menu analysis unless enabled in Plugins | ☐ |
| 10 | **Authenticity on** | Enable in Plugins → select text → context menu → report opens in **sidebar** or fallback tab | ☐ |
| 11 | **Sidebar scope** | Side panel → Selection vs Full page → Run analysis → progress + report | ☐ |
| 12 | **Session fallback** | Authenticity job/report persists while sidebar open (uses `storage.local` fallback) | ☐ |
| 13 | **Navigation** | SPA route change (e.g. fixture) → scanner rescans without reload | ☐ |
| 14 | **Disable** | Toggle off → dimmed content cleared / no new filtering | ☐ |

## Known Firefox differences (expected)

| Topic | Firefox MV2 | Chrome MV3 |
|-------|-------------|--------------|
| Inference host | `background-firefox.js` inline | Offscreen document |
| Authenticity UI | `sidebar_action` or report tab | `sidePanel` API |
| Session storage | Falls back to `storage.local` | Native `storage.session` |
| Host permissions | In `permissions` array | Separate `host_permissions` |

## Regression targets (core profile)

After code changes, re-run rows **1–8** and **14** minimum.

Full profile (`pnpm build:full:firefox`) additionally requires ONNX/WASM smoke on a machine with model packs fetched.

## Sign-off

| Field | Value |
|-------|--------|
| Version | 2.1.2 |
| Firefox version | |
| OS | |
| Tester | |
| Date | |
| Result | Pass / Fail |
| Notes | |
