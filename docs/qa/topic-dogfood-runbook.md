# Topic classifier dogfood runbook (Spike 3 exit)

> **Goal:** Validate `detector-topic-classifier` on real browsing before any v3.1 topic-diet positioning.  
> **Build:** `pnpm build:full` — core build does not include the topic mod.

---

## Setup

1. Load unpacked extension from `dist/` after full build.
2. **Plugins** → enable **Topic classifier (experimental)**.
3. **Preferences** → **Interests** → **Topic diet** → enable + confirm block/allow topics (default: block world/domestic, allow tech/music/culture).
4. Keep **Focus** or **Research** mode — topic layer runs in parallel to noise; badges should show **subject** labels (e.g. `World affairs`), not only `Noise` / `Link-heavy`.

---

## Sites (minimum)

| Site | What to check | Pass criteria |
|------|----------------|---------------|
| **BBC homepage** | Political headlines vs culture/tech cards | Political items dim with world/domestic badge when topic diet on; Bartoli-style culture passes |
| **Reddit** (tech sub) | Italian/English tech threads | Tech allow-list — no topic false blocks |
| **Reddit** (news sub) | Headlines | World-affairs blocks when enabled |
| **Medical/clinical thread** | Long health discussion | Not blocked as politics |

---

## Record per session

| Field | Example |
|-------|---------|
| Date / build | 2026-06-01 / full |
| Mode | Focus |
| Topic diet | on, default policy |
| BBC political recall | 4/6 headlines blocked |
| Tech FP | 0 |
| Noise vs topic badge | separate chips? |
| Notes | |

Save notes in [`dogfood-signoff.md`](./dogfood-signoff.md) or issue log.

---

## Automated gates (before sign-off)

```bash
pnpm test:topic-classifier
pnpm test:topic-embedding-audit
pnpm spike3:bbc          # BBC seed corpus + live RSS; artifacts/spike3-bbc-dogfood-report.txt
pnpm spike3:reddit       # Reddit news recall + allow-list FP; artifacts/spike3-reddit-dogfood-report.txt
pnpm spike3              # both
```

---

## Exit criteria (Spike 3)

- [x] BBC seed corpus: majority of labeled political headlines blocked under topic diet (`pnpm spike3:bbc` — 6/6 on 2026-08-27)
- [ ] BBC homepage: manual badge verify on live site (see [`spike3-bbc-results.md`](./spike3-bbc-results.md))
- [x] Reddit seed corpus: news recall + zero allow-list topic FPs (`pnpm spike3:reddit` — 2026-08-28)
- [ ] Reddit tech: zero topic false-blocks on allow-list (manual live)
- [ ] Reddit news: world-affairs blocks when enabled (manual live)
- [ ] Badges distinguish topic vs noise when both layers match
- [x] Badges distinguish topic vs noise when both layers match (P1-L2: topic primary + noise secondary chip / “also …”)
- [ ] User can enable/disable without breaking noise-only browsing
- [ ] Documented in scope FAQ + wizard copy (noise ≠ topic)

---

## If it fails

- Do **not** expand geopolitics keyword lists for BBC.
- Tune D1 prompts/threshold or corpus labels — see [`../planning/research-semantic-topics.md`](../planning/research-semantic-topics.md).
- Keep topic mod **off by default** in store builds.
