# v3.0 structured dogfood sign-off (A-R5)

> **Purpose:** Repeatable manual QA on **three live sites** before tagging `v3.0.0`.  
> **Gates covered:** §A1–A4 (Focus seeker), §B1–B3 (Comment survivor), §C1–C3 (Preference curator).  
> **Companion:** [`v3-acceptance-checklist.md`](../planning/v3-acceptance-checklist.md) · [`v3-focused-launch-scope.md`](../planning/v3-focused-launch-scope.md)

---

## Dogfood sites

| Site | URL (example) | Role |
|------|---------------|------|
| **Reddit** | `https://www.reddit.com/r/all/` or `old.reddit.com` | Social feed + comment threads (§A, §B) |
| **BBC News** | `https://www.bbc.com/news` → open any article | News context + article body (§A2, §B4 spot-check) |
| **Rate Your Music** | `https://rateyourmusic.com/` → album or list page | Non-social review site (§C, non-social FP check) |

**Substitutes (document in notes if used):** Guardian/Reuters for news; Discogs/Last.fm for non-social.

---

## Before you start

### Build & profile

```bash
pnpm build:core          # Chrome: load dist/
pnpm build:core:firefox  # Firefox: load dist-firefox/
```

Use a **fresh browser profile** (or clear extension storage) for gate **A1**.

### Automated preflight (required)

```bash
pnpm dogfood:preflight
```

Pass criteria:

- Filter audit: **0 false positives** on Focus + Research pass samples (see `artifacts/filter-audit-report.txt`)
- Unit gates for context gating (B3/B4): page context + adaptation pack registry tests green

Record the audit timestamp in the sign-off block below.

---

## Session map — which site covers which gate

| Gate | ID | Primary site | Also valid on |
|------|-----|--------------|---------------|
| §A | A1 | Any (fresh profile) | — |
| §A | A2 | Reddit | BBC article comments |
| §A | A3 | Reddit | Any dimmed block |
| §A | A4 | Reddit | Popup **Recent blocked** or Filtering tab |
| §B | B1 | Reddit (comment thread) | BBC article comments |
| §B | B2 | Reddit | — |
| §B | B3 | `arxiv.org` abstract (5 min) | Unit tests cover this |
| §C | C1 | Any | Add keyword matching visible promo on Reddit |
| §C | C2 | RYM or Spotify | Rules → site allowlist |
| §C | C3 | RYM | Popup mode switch Focus ↔ Research ↔ Unwind |

Recommended order: **Preflight → A1 (fresh) → Reddit session → BBC session → RYM session → arXiv B3**.

---

## Session 1 — Reddit (§A + §B)

**Setup:** Complete wizard with **Quick start (Focus)** or Focus preset. Do **not** open dashboard tabs for A1.

| ID | Steps | Pass criteria | Pass | Notes |
|----|-------|---------------|------|-------|
| **A1** | Fresh profile → install → wizard → **Start browsing** only | Filtering active on Reddit within 2 min; no dashboard required | ☐ | |
| **A2** | Browse `r/all` or a promo-heavy sub with Focus on | Obvious promo/bait **text** posts dimmed or badged | ☐ | |
| **A3** | Click a dimmed post or in-page badge **"… — click to show"** | Content fully visible; stays revealed on scroll | ☐ | |
| **A4** | Open popup → **Recent blocked** (or Filtering tab) | Reason chip / detector id visible for last block | ☐ | |
| **B1** | Dashboard → Unwind mode + enable **`adaptation-en-toxic`** pack → Reddit comment thread | Insult/outrage **text** in comments dimmed | ☐ | |
| **B2** | Find image-only comment (no caption text) | Comment unchanged (not filtered) | ☐ | |

**Stats sanity (regression from v2.3):**

| Check | Pass criteria | Pass |
|-------|---------------|------|
| Filtered ≤ scanned | Popup counts; filtered never exceeds scanned on same page | ☐ |
| Visible blocks | If filtered > 0, at least one dimmed item or badge on page | ☐ |

---

## Session 2 — BBC News

**Setup:** Focus mode on; EN promo/clickbait packs enabled (default Focus bundle or enable in Plugins).

| ID | Steps | Pass criteria | Pass | Notes |
|----|-------|---------------|------|-------|
| **A2** | Open a news article; scroll headline + body | Sensational promo **text** (if present) may filter; long-form body not wrongly hidden | ☐ | |
| **B4** *(spot)* | Same page with clickbait pack | Filtering respects `news` context (no academic-style false blocks on body) | ☐ | Optional; unit tests cover pack merge |

---

## Session 3 — Rate Your Music (non-social)

**Setup:** Focus mode; **do not** enable the music whitelist preset unless testing C2.

| ID | Steps | Pass criteria | Pass | Notes |
|----|-------|---------------|------|-------|
| **Non-social FP** | Album page, review text, track listing | Review/listing text **not** dimmed; filtered ≪ scanned | ☐ | A-R2 threshold class |
| **C3** | Popup → switch **Research** → reload same page | Fewer or no false blocks vs Focus | ☐ | |
| **C3** | Popup → **Unwind** → revisit comment-heavy page if available | Toxic pack sensitivity if enabled | ☐ | |
| **C2** | Rules → add `rateyourmusic.com` to allowlist → reload | No scanning/filtering on RYM | ☐ | |

**Music whitelist (optional note):** Wizard or Rules → enable **Music & lyrics** preset → Spotify/Apple Music skip scanning entirely. Document if used during dogfood.

---

## Session 4 — arXiv (§B3, ~5 min)

| ID | Steps | Pass criteria | Pass | Notes |
|----|-------|---------------|------|-------|
| **B3** | Enable all EN adaptation packs → open `https://arxiv.org/abs/` any paper | Abstract/body **not** filtered; no social promo packs merged | ☐ | Automated: `tests/adaptation/page-context.spec.ts` |

---

## Cross-site — §C rules (any session)

| ID | Steps | Pass criteria | Pass | Notes |
|----|-------|---------------|------|-------|
| **C1** | Rules → add block keyword (e.g. `sponsored`) → browse page containing it | New matches filtered | ☐ | |

---

## Persona sign-off (copy to checklist)

When all **required** rows pass, update [`v3-acceptance-checklist.md`](../planning/v3-acceptance-checklist.md) summary table:

| Persona | Gate | Owner | Date | Pass |
|---------|------|-------|------|------|
| A — Focus seeker | §A | | | ☐ A1–A4 |
| B — Comment survivor | §B | | | ☐ B1–B3 |
| C — Preference curator | §C | | | ☐ C1–C3 |

---

## Run metadata

| Field | Value |
|-------|--------|
| Extension version | |
| Browser + version | |
| OS | |
| Build | `dist/` or `dist-firefox/` |
| Preflight audit date | |
| Tester | |
| Session dates | Reddit / BBC / RYM |
| Overall result | Pass / Fail |
| P0 issues filed | |

---

## Issue template

```text
Title: [Dogfood] <short summary>
Site: Reddit | BBC | RYM | arXiv
Gate: A2 | B1 | …
Mode: Focus | Research | Unwind
Packs enabled: …
Steps: …
Expected: …
Actual: …
Screenshot: …
Popup stats: scanned=… filtered=…
```

---

## Related

- [`chrome-qa.md`](../guides/chrome-qa.md) — broader Chrome manual matrix  
- [`firefox-qa.md`](../guides/firefox-qa.md) — Firefox rows 1–8, 14 (Track C)  
- [`wizard-first-checklist.md`](../planning/wizard-first-checklist.md) — A1 wizard coverage  
- Filter audit artifacts: `artifacts/filter-audit-report.txt`
