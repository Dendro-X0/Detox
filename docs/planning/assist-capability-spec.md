# Assist capability — specification & roadmap (draft)

> **Status:** Draft — **scope deferred** (no Assist build/store promotion until explicitly reopened)  
> **Layer:** Act / Understand (not Steer / automatic filtering)  
> **Related:** [`purposeful-browsing-roadmap.md`](./purposeful-browsing-roadmap.md) P2 · [`../experimental/authenticity-analysis.md`](../experimental/authenticity-analysis.md) · [`v3-focused-launch-scope.md`](./v3-focused-launch-scope.md) (Assist is **not** v3.0 hero)

This document turns the product picture — *users define value; Assist helps them do something with selected text* — into a **working specification** and **phased roadmap**. Nothing here expands the locked v3.0 text-noise launch unless explicitly promoted later.

**2026-08-28:** Maintainer chose **defer** — keep this doc as a parking lot; do not start A1–A4 implementation or Assist store copy. Continue P0/P1 (Track C, Preferences, topic diet Spike 3). Reopen by deciding §7.

---

## 1. Problem statement

Filtering makes the feed quieter. It does not make browsing *more useful* when the user wants to:

- Check whether a claim is backed by public reporting
- Find academic or professional corroboration
- Look up a definition or citation for a term
- Compare a snippet to other sources or to their own knowledge base
- Deepen a topic via wiki / encyclopedia / trusted indexes

**Value is user-defined.** Assist must expose **intents and source scopes** the user can choose quickly — not a single “truth” score applied to the whole page.

---

## 2. Product principles (non-negotiable)

| # | Principle | Implication |
|---|-----------|-------------|
| P1 | **Selection-first** | Default trigger is explicit selection (or clearly opt-in page scope). No silent full-feed “reliability” scoring. |
| P2 | **Steer ≠ Act** | Assist **never** dims/hides content based on authenticity or source disagreement. |
| P3 | **Gather before judge** | Scripts/APIs retrieve public evidence; models may compare claim ↔ snippets only; UI stays advisory. |
| P4 | **Auditable trail** | Every strong claim in a report links to retrieved URLs/excerpts the user can open. No invented citations. |
| P5 | **User-owned scope** | Source packs and personal indexes are opt-in preferences (same mental model as Preferences). |
| P6 | **Honest positioning** | Store/UI: “helps you find and compare sources,” not “detects misinformation.” |
| P7 | **Cheap path first** | Define / search / wiki should work without LLM when possible; Verify is the expensive path. |

---

## 3. Capability model (intents)

One entry point: **Select text → Assist**, then choose intent.

| Intent ID | User job | Primary sources (examples) | Output shape |
|-----------|----------|----------------------------|--------------|
| `search` | Open this text in my search engine | User-configured engine | Hand-off tab / query |
| `define` | What does this term mean? | Wikipedia / Wikidata / glossary pack | Short definition + canonical link |
| `cite` | Where is this discussed formally? | Crossref, OpenAlex, Semantic Scholar (as available) | Title / DOI / abstract links |
| `verify-news` | Is this claim discussed in public reporting? | Search API + ClaimReview + news domains | Epistemic schema + source list |
| `corroborate-academic` | Is there scholarly support / context? | Academic APIs + user academic pack | Papers / reviews, not true/false badge |
| `compare` | How does A relate to B? | Page selection + second snippet / retrieved hit | Side-by-side stance on snippets |
| `query-my-sources` | What do *my* trusted sources say? | User-indexed wiki / docs / PDF set | Passages from personal corpus |

**MVP lean (proposed, not locked):** `search` + `define` + hardened `verify-news` (existing authenticity spine) + lightweight `compare`. Academic packs and personal index are **later** unless scope expands.

---

## 4. Spec — system behavior

### 4.1 Triggers & UX

- Context menu and/or side panel: **Search · Define · Verify · Compare** (labels TBD).
- Dashboard **Assist** section (target IA): enable tools, source packs, API keys, quota, history.
- Wizard: optional “enable assist tools” **off by default** (aligns with P2-L2).
- Progress, cancel, and cache for jobs that take >1s.

### 4.2 Pipeline contract (all Verify-class intents)

```text
selection → intent → query plan (rules / small model)
         → retrieve (APIs / packs only)
         → fetch + extract (public pages)
         → snippet verify (excerpt must exist in body)
         → optional LLM compare against verified snippets only
         → report (fixed schema + limitations)
```

**Forbidden:** LLM-emitted unconstrained URLs; auto-enforcement on the page; treating “no sources found” as “false.”

### 4.3 Epistemic report schema (Verify)

Reuse / extend authenticity framework:

- Claim status: `unsupported` · `disputed` · `partially_supported` · `unknown` (never bare `true`/`false`)
- Per-source `stance`: `supports` · `contradicts` · `neutral` · `unknown`
- Mandatory `limitations` (paywall, single source, opinion, stale, non-English, …)

### 4.4 Source packs

| Pack | Role | Default |
|------|------|---------|
| Encyclopedia | Define / deepen | On when Define enabled |
| News / ClaimReview | Verify-news | Off until user enables Verify |
| Academic | Cite / corroborate | Off |
| Personal index | query-my-sources | Off; local-first preferred |

Packs are configuration, not silent ranking of the feed.

### 4.5 Privacy & cost

- Local-first where possible (define from cached wiki snippets; personal index on-device).
- Network only with user-approved keys / quotas.
- Session trail exportable; optional; not used for Steer.

### 4.6 Explicit non-goals (until scope changes)

- Auto-hiding posts scored as “misinformation”
- Guaranteeing truth for breaking news or closed-access papers
- Replacing library databases or institutional SSO research tools
- Visual / image authenticity as launch Assist (see [`../experimental/visual-analysis.md`](../experimental/visual-analysis.md) — Track 3 only)
- Building a general web crawler or hosting a proprietary “truth graph”

---

## 5. Roadmap (proposed)

Versions are **indicative** and sit under purposeful-browsing **P2 / P3**. Reorder when scope decisions close.

### Phase A0 — Spec lock & inventory · **now**

| # | Deliverable | Exit |
|---|-------------|------|
| A0-1 | This draft reviewed; open decisions in §7 decided or deferred | Written decisions |
| A0-2 | Inventory current authenticity mod vs gaps (T0–T3, ClaimReview, side panel) | Gap list in this doc or linked issue |
| A0-3 | Store/FAQ copy constraints for Assist (honest scope) | Checklist item |

### Phase A1 — Convenience Assist (no new “oracle”) · **~P2 early**

| # | Deliverable | Job |
|---|-------------|-----|
| A1-1 | Context menu **Search selection** (engine configurable) | Act |
| A1-2 | Context menu / panel **Define** (Wikipedia/Wikidata script path) | Act |
| A1-3 | Dashboard Assist: toggles + “how this differs from filtering” | UX |
| A1-4 | Quota / cache / cancel for any network Assist job | Logic |

**Exit:** User can select text and get search or definition without enabling Verify; Assist unused ≠ broken filtering.

### Phase A2 — Harden Verify (news) · **~P2**

| # | Deliverable | Job |
|---|-------------|-----|
| A2-1 | Script-first retrieval hardening (existing authenticity target) | Logic |
| A2-2 | Intent chip **Verify** from selection → side panel report | Act |
| A2-3 | Auditable trail UI (sources, stances, limitations) | UX |
| A2-4 | Optional wizard opt-in for Assist | UX |

**Exit:** Dogfood: selection → report with real links; zero feed auto-hide from Verify.

### Phase A3 — Compare & deepen · **~P2 late / P3**

| # | Deliverable | Job |
|---|-------------|-----|
| A3-1 | **Compare** selection vs second snippet / retrieved hit | Act |
| A3-2 | Optional page outline / key claims (opt-in Understand) | Understand |
| A3-3 | News + encyclopedia packs polish | Scope |

### Phase A4 — Specialist value · **~P3+ (scope TBD)**

| # | Deliverable | Job |
|---|-------------|-----|
| A4-1 | Academic cite / corroborate pack | Act |
| A4-2 | Personal / org source index (local-first) | Act |
| A4-3 | Domain presets (“research day”: Define + Academic + Research mode Steer) | Cross-layer |

**Exit:** Specialist can query *their* sources from any page selection without leaving the browser.

### Phase A5 — Visual assist · **explicitly deferred**

Tracked only under experimental visual analysis; not part of Assist A1–A4 until a separate scope lock.

---

## 6. Success metrics (Assist)

| Metric | A1 | A2 | A4 |
|--------|----|----|-----|
| Time to first Assist action after install | ≤ 30s once tools enabled | ≤ 30s | ≤ 60s including index setup |
| % Assist runs with ≥1 openable source link (Verify) | — | ≥ 80% when retrieval succeeds | ≥ 80% |
| User confusion: Assist vs filter (dogfood / support) | “Rare” | “Rare” | “Rare” |
| Auto-hide from authenticity | **0** | **0** | **0** |
| Store complaint theme | Not “it fact-checks the web for me” | Same | Same |

---

## 7. Open decisions (scope & direction)

Fill these in before promoting Assist in store copy or expanding engineering beyond A1.

| ID | Question | Options | Current lean | Decision |
|----|----------|---------|--------------|----------|
| D1 | Is Assist a **secondary** feature after Preferences/topic diet, or a **parallel** pillar sooner? | After P1 · Parallel · Assist-first wedge | After P1 (roadmap step 6) | **Deferred** |
| D2 | MVP intents? | Search+Define only · +Verify · +Compare · Full table | Search+Define+hardened Verify | **Deferred** |
| D3 | Personal/org index in v1 Assist story? | Yes local · Cloud optional · Defer to A4 | Defer to A4 | **Deferred** |
| D4 | Academic APIs — required for “valuable browsing” pitch? | Required · Optional pack · Out | Optional pack | **Deferred** |
| D5 | Default network: Brave/search keys vs Wikipedia-only free path? | Free wiki path mandatory · Keys required for any Assist | Free path for Define/Search | **Deferred** |
| D6 | Full-page Verify scope? | Selection only · Opt-in page · Both | Selection default; page opt-in | **Deferred** |
| D7 | Dashboard: dedicated **Assist** tab vs Plugins subsection? | Assist tab · Plugins · Both | Assist section in IA target | **Deferred** |
| D8 | Relationship to authenticity experimental brand | Rename under Assist · Keep “authenticity” · Split | Fold Verify under Assist; keep experimental badge | **Deferred** |

---

## 8. Relationship to existing docs

| Doc | Role |
|-----|------|
| [`purposeful-browsing-roadmap.md`](./purposeful-browsing-roadmap.md) | Platform Steer · Act · Understand; P2 bullets expanded here |
| [`../experimental/authenticity-analysis.md`](../experimental/authenticity-analysis.md) | Engineering detail for Verify-news pipeline |
| [`v3-focused-launch-scope.md`](./v3-focused-launch-scope.md) | Launch lock — Assist not hero |
| [`ux-capability-roadmap.md`](./ux-capability-roadmap.md) | Personas; Assist as convenience for research-heavy users |
| [`../experimental/visual-analysis.md`](../experimental/visual-analysis.md) | Out of Assist A1–A4 |

---

## 9. Immediate next steps (while scope is deferred)

1. ~~**Review §7**~~ — **Deferred** (2026-08-28); reopen when ready to lock D1–D8.
2. **Do not** start A0 inventory, A1–A4 implementation, or Assist store listing work.
3. **Continue** P0 Track C (store upload / Firefox QA) and P1 (topic diet Spike 3 / Preferences polish).
4. When reopened: decide §7 → A0-2 inventory → A1 tickets only.

---

## Changelog

| Date | Note |
|------|------|
| 2026-08-28 | Initial draft from Assist / verification / cross-reference product discussion |
| 2026-08-28 | **Scope deferred** — §7 D1–D8 deferred; no A1–A4 or store Assist work until reopened |
