# Store screenshots (1280×800)

Capture before **v2.3.0** unlisted submit (Track C-R4). Positioning: **textual noise filter** — not authenticity hero.

Use a clean browser profile with the **core** build from `dist/` or `dist-firefox/`.

## Setup

1. `pnpm build` (Chrome) or `pnpm build:firefox`
2. Load extension; complete install wizard with **Start browsing**
3. Set browser window to **1280×800** (or 640×400 for smaller AMO assets)
4. Hide personal bookmarks bar; neutral wallpaper

## Required shots (listing order)

| # | Scene | Hero message | How to capture |
|---|--------|--------------|----------------|
| 1 | **Wizard welcome or Done** | Text-only scope is honest | Fresh profile → welcome step showing `textOnlyLimitation`, or Done with **Start browsing** |
| 2 | **Popup — Focus on** | One-tap focus | Toolbar popup: Focus enabled, mode switcher, today stats |
| 3 | **Filtering tab** | User controls sensitivity | Options → Filtering: scope honesty note + sensitivity/style |
| 4 | **Page — dimmed + badge** | Reveal-first filtering | `tests/fixtures/filtering/core-targets.html` or live promo text; show dim + **click to show** badge |
| 5 | **Overview — modes** | Focus / Research / Unwind | Options → Overview → browsing modes panel |
| 6 | *(Optional, not hero)* **Authenticity** | Experimental only | Plugins → enable assist → selection analysis — **do not use as screenshot #1–2** |

## Do / don't (Option A)

| Do | Don't |
|----|-------|
| Lead with filtering, reveal, wizard | Lead with fact-check / authenticity sidebar |
| Show dimmed **text** blocks | Imply image/meme moderation |
| Mention reversible dimming in caption if needed | Claim "blocks misinformation" |

## File naming

Save under `store/screenshots/` (gitignored until ready):

```
store/screenshots/01-wizard-text-scope.png
store/screenshots/02-popup-focus.png
store/screenshots/03-filtering-tab.png
store/screenshots/04-dimmed-reveal-badge.png
store/screenshots/05-browsing-modes.png
```

## Store upload

- **Chrome:** up to 5 screenshots at 1280×800 or 640×400
- **Firefox:** follow AMO size guidance in developer hub

Copy: [`listing-chrome.md`](./listing-chrome.md) · scope audit: [`SCOPE-AUDIT.md`](./SCOPE-AUDIT.md)
