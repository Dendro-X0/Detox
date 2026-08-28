# Spike 3 — Reddit session results

> **Date:** 2026-08-28  
> **Build:** D1 prompt snapshot  
> **Command:** `pnpm spike3:reddit` → `artifacts/spike3-reddit-dogfood-report.txt`

---

## Automated gate (seed corpus)

| Metric | Result | Gate | Status |
|--------|--------|------|--------|
| News-sub political recall | **3/3 (100%)** | ≥ 80% | ✅ |
| Allow-list false-block (tech/culture/health) | **0/7 (0%)** | 0% | ✅ |
| Medical/clinical thread | pass (`health-science`) | must pass | ✅ |
| Italian tech thread | pass (`tech`) | must pass | ✅ |

---

## Manual extension verify (remaining)

1. `pnpm build:full` → load unpacked `dist/`
2. Plugins → Topic classifier ON; Preferences → Interests → Topic diet ON  
3. `reddit.com/r/technology` — no topic false-blocks on tech threads  
4. A news sub — political titles dim with world/domestic badges  
5. Check exit boxes in [`topic-dogfood-runbook.md`](./topic-dogfood-runbook.md)

---

## Exit criteria (Spike 3 — Reddit row)

- [x] Reddit seed corpus: news recall + zero allow-list topic FPs (automated)
- [ ] Reddit live subs: manual badge verify
