# Tests

## Scanner unit tests (offline)

Recorded HTML snapshots under `fixtures/scanner/` and `fixtures/acceptance/` stand in for live sites in CI.

```bash
pnpm test:scanner      # S0–S5 + Phase 8 pipeline/perf vitest suite
pnpm test:scanner:pipeline  # ClassificationPipeline + registry unit tests
pnpm test:scanner:perf      # Offline scanner perf budgets
pnpm test:core              # scanner vitest + core filtering E2E
pnpm test:scanner:s0   # fixture catalog only
pnpm test:scanner:s4   # acceptance scenarios only
pnpm test:scanner:s5   # site hint packs
```

## Extension E2E

Requires a built extension (`pnpm build`) and Chromium.

```bash
pnpm test:e2e:core              # filtering pipeline on blank fixture
pnpm test:e2e:acceptance        # S4 SPA + static article via universal scanner
pnpm test:e2e                   # all Playwright tests
```

Fixture server: `tests/fixtures/e2e-server.mjs` (port `4173`).

---

## S4 manual acceptance checklist

Run with `pnpm dev`, load the extension unpacked from `dist/`, and verify each scenario on a real URL. Use the popup or side panel **scanned / filtered** counts and DevTools console (`[Core] Using universal scanner`).

| # | Scenario | Suggested URL | Pass criteria |
|---|----------|---------------|---------------|
| 1 | **Static article** | Long-form news article (e.g. BBC, Reuters) | Most body paragraphs discovered; no duplicate dims on rescroll |
| 2 | **Reddit thread** | Post with 250–1k visible comments | Scanned count within **±15%** of visible post + comments; count does **not** keep climbing after idle |
| 3 | **Infinite scroll** | HN front page or Reddit listing | Scanned increases as you scroll; plateaus ~30s after stopping |
| 4 | **SPA navigation** | Reddit home → post → back | Page scanned count **resets** on route change; previous route does not add to new total |
| 5 | **Shadow DOM** | Site with web-component comments (if available) | Comment text in shadow roots is scanned |

### Notes

- Reload the extension after build; universal scanner is always active (no legacy adapter toggle).
- Record new snapshots: save “Save as” HTML (single file) into `tests/fixtures/acceptance/` and add expectations in `tests/scanner/acceptance-expectations.ts`.
- Regenerate the Reddit thread snapshot: `pnpm generate:fixtures` → `tests/fixtures/acceptance/reddit-thread.html` (48 comments).
- Reddit acceptance in CI loads **`reddit-thread.html` from disk** — manual runs should still validate real thread scale.
- Expand / load-more rescans: `tests/scanner/expand-triggers.spec.ts` + `fixtures/acceptance/expand-reveal.html`.

### Sign-off

- [ ] Static article
- [ ] Reddit thread (±15%, no runaway)
- [ ] Infinite scroll plateau
- [ ] SPA stats reset
- [ ] Shadow DOM (or N/A with documented substitute)

When all boxes are checked and `pnpm test:scanner` + `pnpm test:e2e:acceptance` pass, S4 is complete.
