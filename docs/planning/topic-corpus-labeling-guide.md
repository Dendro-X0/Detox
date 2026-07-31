# Topic corpus labeling guide (Spike 1)

> **Goal:** Build `tests/fixtures/filtering/topic-corpus.json` to evaluate semantic topic classifiers (Track D).  
> **Target size:** 200 labeled units (v1 seed: 37 — expand before Spike 2 exit).  
> **Companion:** [`research-semantic-topics.md`](./research-semantic-topics.md)

---

## When to label

- After browsing dogfood sites (BBC, Reddit, music/review pages)
- When adding a headline that **failed or passed** keyword filtering unexpectedly
- Before comparing D1/D2 models — **same corpus** for all methods

---

## Sample fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique slug, e.g. `bbc-armenia-votes` |
| `text` | yes | Exact or lightly normalized unit text (headline, comment, paragraph) |
| `primaryTopic` | yes | One of 8 taxonomy IDs (below) |
| `blockUnderNewsDiet` | yes | Should `DEFAULT_NEWS_DIET_POLICY` block this? |
| `note` | no | Why this sample matters (dogfood, edge case) |
| `source` | no | `bbc`, `reddit`, `rym`, `manual`, … |
| `language` | no | `en`, `de`, `it`, `zh`, … |

### `blockUnderNewsDiet` meaning

Uses research policy:

- **Block topics:** `world-affairs`, `domestic-politics`
- **Allow topics:** `tech`, `music`, `culture-arts`

For other topics (`business`, `health-science`, `sports`): set `blockUnderNewsDiet: false` unless you explicitly want them blocked in the research profile.

---

## Taxonomy v0 (primary topic)

| ID | Label when… | Examples |
|----|-------------|----------|
| `world-affairs` | International relations, wars, foreign elections, diplomacy | “Armenia votes as Russia piles pressure…” |
| `domestic-politics` | National government, local elections, policy fights | “Parliament votes on the revised budget…” |
| `tech` | Software, hardware, dev tools, product/API news | Antigravity CLI thread, TikTok Farlands |
| `music` | Artists, albums, concerts, streaming | Album review, symphony series |
| `culture-arts` | Film, books, theater, opera, reviews | Bartoli headline, James Bond culture piece |
| `business` | Markets, companies, pricing, CEO interviews | Hinge CEO, dynamic pricing |
| `health-science` | Medicine, public health, research news | Vaccine trial, El Niño science piece |
| `sports` | Matches, leagues, tournaments | Championship extra time |

**Rules:**

1. Pick the **dominant** topic if mixed (“tech CEO interview” → `business` if earnings-focused, `tech` if product-focused).
2. **Noise tone ≠ topic** — “this is suck” on a tech subreddit is still `tech` context if that's the thread; noise layer handles tone separately.
3. **Non-English** — label by **subject**, not language (`it` tech thread → `tech`).
4. **Short text** — OK if it’s a real headline or comment; note low confidence expected.

---

## Sourcing mix (target 200)

| Source | Target count | Purpose |
|--------|--------------|---------|
| BBC headlines | 60 | News diet recall |
| Reddit titles/comments | 60 | Social + multilingual |
| Tech forums/docs | 40 | FP holdout |
| Music/review sites | 20 | Allow-list pass |
| Health/science | 20 | Medical FP holdout |

---

## Quality checks

1. **Re-label 20%** after 48 hours — aim Cohen’s κ ≥ 0.7 with first pass.
2. Run `pnpm test:topic-audit` — corpus must validate; D0 baseline is **not** a ship gate.
3. Add samples that **fooled keywords** — those are highest value.

---

## Adding a sample

1. Edit `tests/fixtures/filtering/topic-corpus.json`
2. Run `pnpm test:topic-audit`
3. Check `artifacts/topic-audit-report.txt` for D0 false negatives (BBC political without phrases)

---

## Spike 1 exit criteria

- [ ] ≥ 80 BBC/world-affairs political headlines labeled
- [ ] ≥ 40 tech holdout samples (incl. Italian + Chinese)
- [ ] κ ≥ 0.7 on re-label subset
- [ ] D0 baseline documented (expect low BBC recall — motivates D1/D2)
