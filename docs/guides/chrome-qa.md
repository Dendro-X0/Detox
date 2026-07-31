# Chrome manual QA checklist

> **When to use:** Dogfood and pre-release validation on Chrome/Chromium. Firefox rows are deferred until AMO testing is available.

**Build:** `pnpm build:core` → load `dist/` as unpacked extension (`chrome://extensions` → Developer mode → Load unpacked).

**Fixture server (for scripted checks):** `pnpm test:e2e:core` and `pnpm test:e2e:acceptance` spin up fixtures automatically. For manual browsing, use any normal site with posts/comments after wizard setup.

---

## First-run wizard (Chrome)

| # | Step | Pass criteria |
|---|------|---------------|
| 1 | Fresh install → options opens wizard | Welcome screen visible; Quick start available |
| 2 | Quick start (Focus) | Popup shows enabled; no dashboard required |
| 3 | Full wizard preset path | All steps advance; **Research assist** step skippable (off by default) |
| 4 | Start browsing | Filtering active on a normal page (not `chrome://`) |
| 5 | Re-run wizard (`?wizard=1`) | Previous choices pre-filled |

## Core filtering

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 6 | Reddit or news comment thread | Some items dimmed per Focus mode; click reveals content |
| 7 | Whitelisted domain (e.g. Google Docs if preset enabled) | No dimming on whitelisted site |
| 8 | Popup toggle off/on | Off stops new filtering; on resumes |
| 9 | Dashboard → switch browsing mode | Mode change applies on next page or rescan |

## Scanner / SPA

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 10 | Scroll long feed | Scanned count grows then plateaus (no runaway) |
| 11 | SPA in-app navigation (e.g. Reddit post → back) | Per-page stats reset; no bleed from previous route |
| 12 | Site hint mods (Reddit/YouTube if enabled) | Sidebar/recommendations less likely to be scanned |

## Authenticity assist (optional)

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 13 | Enable in wizard or Plugins | Side panel opens from context menu on selection |
| 14 | Search-only (Wikipedia default) | Report lists sources; no LLM key required |
| 15 | Selection on social feed | Advisory flags only; content never auto-hidden |

## Privacy & storage

| # | Check | Pass criteria |
|---|-------|---------------|
| 16 | Options → Privacy | Policy link opens `store/PRIVACY.md` content |
| 17 | Export settings | JSON downloads; re-import restores config |

---

## Automated coverage (run before manual pass)

```bash
pnpm dogfood:preflight     # filter audit + context gates (start here for v3.0 dogfood)
pnpm test:scanner          # unit + acceptance fixtures
pnpm test:filter-audit     # Focus + Research FP audit; writes artifacts/filter-audit-report.txt
pnpm test:e2e:core         # wizard + filtering E2E
pnpm test:e2e:acceptance   # SPA + static article E2E
```

Structured v3.0 dogfood (Reddit + BBC + RYM): [`../qa/dogfood-signoff.md`](../qa/dogfood-signoff.md).

## Reporting issues

Note: URL, browsing mode, steps, expected vs actual, and whether Quick start or full wizard was used. Screenshots of dimmed content and side panel reports help for filtering vs authenticity bugs.
