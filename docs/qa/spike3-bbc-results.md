# Spike 3 — BBC session results

> **Date:** 2026-08-27  
> **Build:** `main` @ bundled D1 prompt snapshot (`prompt-embeddings.snapshot.json`)  
> **Command:** `pnpm spike3:bbc` → `artifacts/spike3-bbc-dogfood-report.txt`

---

## Automated gate (seed corpus)

| Metric | Result | Gate | Status |
|--------|--------|------|--------|
| BBC political recall | **6/6 (100%)** | ≥ 80% | ✅ |
| Culture/tech false-block | **0/6 (0%)** | ≤ 15% | ✅ |
| Bartoli culture headline | pass (`unknown`, 26%) | must pass | ✅ |

All phrase-poor political headlines blocked under default news diet (block world/domestic; allow tech/music/culture). No false blocks on culture, tech, business, or science samples.

---

## Live BBC RSS

| Status | Notes |
|--------|-------|
| ☐ Skipped in CI/agent env | `fetch` to `feeds.bbci.co.uk` timed out — run locally: `pnpm spike3:bbc` |

---

## Manual extension verify (remaining)

1. `pnpm build:full` → load unpacked `dist/`
2. Plugins → **Topic classifier (experimental)** ON
3. Preferences → Interests → **Topic diet** ON (default block/allow)
4. Visit [bbc.com/news](https://www.bbc.com/news) — political cards dim with **World affairs** / **Domestic politics** badges; culture/tech cards pass
5. Record row in [`topic-dogfood-runbook.md`](./topic-dogfood-runbook.md) + check exit box when Reddit session also done

---

## Exit criteria (Spike 3 — BBC row)

- [x] BBC seed corpus: majority political blocked under topic diet (automated)
- [ ] BBC homepage: manual badge verify on live site
- [ ] Reddit tech + news sessions (separate runbook rows)
