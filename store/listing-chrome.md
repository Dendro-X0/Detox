# Chrome Web Store listing (draft)

Use this copy when submitting the **core** build (`signallens-chrome-core-*.zip`).

**Scope audit:** [`SCOPE-AUDIT.md`](./SCOPE-AUDIT.md) · **FAQ:** [`../docs/scope-faq.md`](../docs/scope-faq.md)

## Single purpose

Help users reduce distracting **textual** noise on the web using **personal** keyword and mode settings — always reversible (dim/reveal), never permanent blocking.

## Short description (≤ 132 characters)

Reduce textual noise — promo, bait, toxic language. Reveal-first dimming. Local rules, your keywords. Image-only posts not filtered.

## Detailed description

**SignalLens** is a personal browsing layer for **text-first** noise reduction — not a feed fact-checker or image moderator.

### What it does

- Scans **readable text** on pages you visit (posts, comments, headlines, captions)
- Dims text that matches **your** block keywords and browsing mode (Focus / Research / Unwind)
- Keeps filtered content **revealable** — click any match or the in-page badge to show it again
- Runs core filtering **locally** in your browser

### What it does not do

- Does **not** filter image-only posts (no caption text to classify)
- Does **not** analyze pictures, video, or memes without readable text
- Does **not** permanently remove content or auto-label posts as true/false
- Does **not** upload page text for core filtering

### Optional experimental features

**Authenticity assist** (off by default) lets you research a **selected passage** with advisory source links. It does not filter your feed and is not required for core noise reduction.

### Privacy

Core filtering runs on your device. See our privacy policy (privacy policy at https://github.com/Dendro-X0/Detox/blob/main/store/PRIVACY.md).

## Category

Productivity

## Language

English

## Screenshots checklist

Capture at 1280×800 or 640×400:

1. **Onboarding wizard** — welcome step showing text-only limitation, or done step with **Start browsing**
2. Popup — Focus mode enabled + browsing mode switcher
3. Options dashboard — Filtering tab (scope note + sensitivity)
4. Page with dimmed content + reveal hint / badge
5. Browsing modes panel (Overview tab)
6. *(Optional)* Authenticity side panel — selection scope (experimental, not hero)

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
- [ ] Run `pnpm store:verify:scope` — listing copy audit
- [ ] Rotate mod signing trust anchor (production keys)
- [ ] Host privacy policy at a public URL
- [ ] Upload zip from `releases/`, not raw `dist/` folder
- [ ] Set visibility: Unlisted for first review if preferred
