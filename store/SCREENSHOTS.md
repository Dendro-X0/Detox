# Store screenshots (1280×800)

Capture before **v3.0.0** listed submit (Track C-R4). Positioning: **Assist-first** — selection search/define/compare hero; reversible textual quieting secondary.

Use a clean browser profile with the **core** build from `dist/` or `dist-firefox/`.

## Setup

1. `pnpm build` (Chrome) or `pnpm build:firefox`
2. Load extension; complete install wizard with Assist opt-in (or skip) → **Start browsing**
3. Set browser window to **1280×800** (or 640×400 for smaller AMO assets)
4. Hide personal bookmarks bar; neutral wallpaper

## Required shots (listing order)

| # | Scene | Hero message | How to capture |
|---|--------|--------------|----------------|
| 1 | **Selection Assist toolbar** | Research while you browse | Enable Assist in wizard → highlight text on any page → show search/define/compare chips |
| 2 | **Wizard Assist step or Done** | Honest opt-in | Fresh profile → Assist step (toolbar + optional Verify) or Done with **Start browsing** |
| 3 | **Popup — Focus on** | One-tap focus | Toolbar popup: Focus enabled, mode switcher, today stats |
| 4 | **Page — dimmed + badge** | Reveal-first quieting | `tests/fixtures/filtering/core-targets.html` or live promo text; show dim + **click to show** badge |
| 5 | **Options — Assist tab** | User controls Assist | Options → Assist: toolbar toggle + search engine |
| 6 | *(Optional, not hero)* **Verify** | Experimental only | Enable Verify → selection analysis in side panel — **do not use as screenshot #1** |

## Do / don't (Assist-first)

| Do | Don't |
|----|-------|
| Lead with selection Assist, reveal, wizard opt-in | Lead with “fact-check your feed” |
| Show dimmed **text** blocks as secondary benefit | Imply image/meme moderation |
| Mention reversible dimming in caption if needed | Claim "blocks misinformation" |
| Show Verify as optional / experimental | Market keyword-list editing as hero |

## File naming

Save under `store/screenshots/` (gitignored until ready):

```
store/screenshots/01-assist-toolbar.png
store/screenshots/02-wizard-assist-step.png
store/screenshots/03-popup-focus.png
store/screenshots/04-dimmed-reveal-badge.png
store/screenshots/05-assist-settings.png
```

## Store upload

- **Chrome:** up to 5 screenshots at 1280×800 or 640×400
- **Firefox:** follow AMO size guidance in developer hub

Copy: [`listing-chrome.md`](./listing-chrome.md) · scope audit: [`SCOPE-AUDIT.md`](./SCOPE-AUDIT.md)
