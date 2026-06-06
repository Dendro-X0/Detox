# Chrome Web Store listing (draft)

Use this copy when submitting the **core** build (`signallens-chrome-core-*.zip`).

## Single purpose

Help users reduce distracting or unwanted web content using **personal** keyword and mode settings — always reversible (dim/reveal), never permanent blocking.

## Short description (≤ 132 characters)

Browse with focus: filter noise using your keywords and modes. Local-first, reversible dimming. Optional research assist.

## Detailed description

**SignalLens** is a personal browsing layer — not a “detox” or moralizing filter.

### What it does

- Scans readable content on pages you visit
- Dims (or blurs/collapses in full builds) text that matches **your** block keywords
- Offers **Focus / Research / Unwind** browsing modes — one tap updates sensitivity, keywords, and filter style
- Keeps filtered content **revealable** with a click

### What it does not do

- Does not permanently remove content
- Does not label content as “true” or “false” by default
- Does not upload page text for core filtering (local heuristic matching)

### Optional experimental features

**Authenticity assist** (off by default) helps you research a **selected passage** with advisory flags and source links. Search-only mode uses zero LLM tokens unless you opt in.

### Privacy

Core filtering runs on your device. See our privacy policy (privacy policy at https://github.com/Dendro-X0/Detox/blob/main/store/PRIVACY.md).

## Category

Productivity

## Language

English

## Screenshots checklist

Capture at 1280×800 or 640×400:

1. **Onboarding wizard** — mode step or done step with **Start browsing** (v2.1.2+)
2. Popup — Focus mode enabled + browsing mode switcher
3. Options dashboard — Filtering tab + Rules (essential surfaces)
4. Page with dimmed content + reveal hint
5. Browsing modes panel (Overview tab)
6. (Optional) Authenticity side panel — selection scope

## Permission justifications (review form)

| Permission | Justification |
|------------|---------------|
| `storage` | Persist user filtering rules, modes, and scan statistics locally. |
| `activeTab` | Access the active tab when the user opens the popup or triggers analysis. |
| `contextMenus` | “Analyze selection” entry for optional authenticity assist. |
| `offscreen` | On-device inference host for optional full-profile ONNX packs. |
| `scripting` | Inject/update content scripts when enabling features on the active tab. |
| `sidePanel` | Display authenticity analysis reports the user explicitly requests. |
| `<all_urls>` | Content script must run on sites the user browses to apply personal filters. |
| `https://en.wikipedia.org/*` | Optional authenticity search provider (user-enabled). |
| `https://api.search.brave.com/*` | Optional Brave Search API (user-supplied key). |
| Hugging Face hosts | Legacy/full-profile model pack loading only when user enables local ONNX pack. |

## Pre-submit

- [ ] Run `pnpm release:chrome` locally — verify passes
- [ ] Rotate mod signing trust anchor (production keys)
- [ ] Host privacy policy at a public URL
- [ ] Upload zip from `releases/`, not raw `dist/` folder
- [ ] Set visibility: Unlisted for first review if preferred
