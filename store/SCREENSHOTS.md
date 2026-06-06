# Store screenshots (1280×800)

Capture before v2.2.0 unlisted submission. Use a clean browser profile with the **core** build loaded unpacked from `dist/` or `dist-firefox/`.

## Setup

1. `pnpm build` (Chrome) or `pnpm build:firefox`
2. Load extension; complete install wizard with **Start browsing**
3. Set browser window to **1280×800** (or capture at 640×400 for smaller AMO assets)
4. Hide personal bookmarks bar if possible; use neutral wallpaper

## Required shots (order for listing)

| # | Scene | How to capture |
|---|--------|----------------|
| 1 | **Onboarding wizard — Done step** | Fresh profile → `options.html?wizard=1` → finish to Done with **Start browsing** visible |
| 2 | **Popup — Focus on** | Toolbar popup: Focus enabled, browsing mode switcher, today stats |
| 3 | **Dashboard — Filtering** | Options → Filtering tab: sensitivity + style visible |
| 4 | **Page — dimmed content** | Open `tests/fixtures/filtering/core-targets.html` or any page with block keywords; show dim + reveal hint |
| 5 | **Overview — browsing modes** | Options → Overview → Browsing modes panel |
| 6 | *(Optional)* **Authenticity sidebar** | Enable in Plugins → select text → run analysis (experimental) |

## File naming

Save under `store/screenshots/` (gitignored until ready):

```
store/screenshots/01-wizard-done.png
store/screenshots/02-popup-focus.png
…
```

Add `store/screenshots/.gitkeep` only if you want the folder tracked empty.

## Store upload

- **Chrome:** up to 5 screenshots at 1280×800 or 640×400
- **Firefox:** similar; follow AMO current size guidance in developer hub

Update listing copy in [`listing-chrome.md`](./listing-chrome.md) if UI labels change.
