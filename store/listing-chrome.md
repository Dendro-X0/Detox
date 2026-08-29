# Chrome Web Store listing (draft)

Use this copy when submitting the **core** build (`signallens-chrome-core-*.zip`).

**Scope audit:** [`SCOPE-AUDIT.md`](./SCOPE-AUDIT.md) · **FAQ:** [`../docs/scope-faq.md`](../docs/scope-faq.md)

## Single purpose

Help users **research selected text** and browse with less distracting **textual** noise — always reversible (dim/reveal), never permanent blocking.

## Short description (≤ 132 characters)

Select text to search, define, compare. Reversible dimming for textual noise. Local-first. Image-only posts not filtered.

## Detailed description

**SignalLens** is a personal browsing layer: **selection Assist** for quick research, plus automatic quieting of low-value **text** — not a feed fact-checker or image moderator.

### What it does

- **Assist (primary):** Select text on any page to **search**, **define**, or **compare** snippets via toolbar or context menu (user-enabled in setup)
- **Quieting (secondary):** Dims readable **text** that matches your browsing mode (Focus / Research / Unwind) — click any match or the in-page badge to reveal again
- Runs core filtering **locally** in your browser; no account required

### What it does not do

- Does **not** filter image-only posts (no caption text to classify)
- Does **not** analyze pictures, video, or memes without readable text
- Does **not** permanently remove content or auto-label posts as true/false
- Does **not** upload page text for core filtering

### Optional experimental features

**Verify** (off by default) lets you check a **selected passage** against public sources with advisory links and fetched excerpts. It does not filter your feed and is not required for search/define/compare.

### Privacy

Core filtering runs on your device. Optional Assist network calls are user-initiated only. See our privacy policy (privacy policy at https://github.com/Dendro-X0/Detox/blob/main/store/PRIVACY.md).

## Category

Productivity

## Language

English

## Screenshots checklist

Capture at 1280×800 or 640×400:

1. **Selection Assist** — toolbar on highlighted text (search / define / compare)
2. **Onboarding wizard** — Assist opt-in step or done step with **Start browsing**
3. Popup — Focus mode enabled + browsing mode switcher
4. Page with dimmed content + reveal hint / badge
5. Options dashboard — **Assist** tab (toolbar toggle)
6. *(Optional)* Verify side panel — selection scope (experimental, not hero)

## Permission justifications (review form)

| Permission | Justification |
|------------|---------------|
| `storage` | Persist user filtering rules, modes, Assist settings, and scan statistics locally. |
| `activeTab` | Access the active tab when the user opens the popup or triggers Assist. |
| `contextMenus` | Search / define / compare / verify entries for user-selected text. |
| `offscreen` | On-device inference host for optional full-profile ONNX packs. |
| `scripting` | Inject/update content scripts when enabling features on the active tab. |
| `sidePanel` | Display Verify analysis reports the user explicitly requests. |
| `<all_urls>` | Content script must run on sites the user browses to apply filters and selection Assist. |
| `https://en.wikipedia.org/*` | Optional Define and Verify search provider (user-enabled). |
| `https://api.search.brave.com/*` | Optional Brave Search API (user-supplied key). |
| Hugging Face hosts | Legacy/full-profile model pack loading only when user enables local ONNX pack. |

## Pre-submit

- [ ] Run `pnpm release:chrome` locally — verify passes
- [ ] Run `pnpm store:verify:scope` — listing copy audit
- [ ] Rotate mod signing trust anchor (production keys)
- [ ] Host privacy policy at a public URL
- [ ] Upload zip from `releases/`, not raw `dist/` folder
- [ ] Set visibility: Unlisted for first review if preferred
