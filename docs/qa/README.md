# QA

Manual and structured test runbooks for pre-release validation.

## Documents

| Document | Description |
|----------|-------------|
| [`dogfood-signoff.md`](./dogfood-signoff.md) | **v3.0 Track A-R5** — Reddit + news + non-social dogfood; §A–§C sign-off |
| [`dogfood-issue-log.md`](./dogfood-issue-log.md) | **Track C-R5** — 30-day dogfood P0 issue tracker |
| [`../planning/v3-acceptance-checklist.md`](../planning/v3-acceptance-checklist.md) | Full v3.0 persona gate matrix |
| [`../guides/chrome-qa.md`](../guides/chrome-qa.md) | Chrome manual smoke matrix |
| [`../guides/firefox-qa.md`](../guides/firefox-qa.md) | Firefox MV2 manual QA |

## Commands

```bash
pnpm release:preflight   # Track C / §G automated gates before v2.3.0 tag
pnpm dogfood:preflight   # Automated gates before manual dogfood (A-R5)
pnpm test:filter-audit   # Focus + Research FP audit → artifacts/
pnpm test:scanner        # Unit + acceptance fixtures
pnpm test:e2e:core       # Wizard + filtering E2E
```
