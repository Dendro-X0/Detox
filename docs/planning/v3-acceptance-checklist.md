# v3.0.0 acceptance checklist

> **Purpose:** Manual and automated gates before **initial public release** (listed Chrome + Firefox).  
> **Derived from:** [`ux-capability-roadmap.md`](./ux-capability-roadmap.md) persona scenarios · [`version-roadmap.md`](./version-roadmap.md) Phase 5  
> **How to use:** Run after v2.3.x refinement; sign off each row before tagging `v3.0.0`.

---

## Sign-off summary

| Persona | Gate | Owner | Date | Pass |
|---------|------|-------|------|------|
| A — Focus seeker | §A | | | ☐ |
| B — Comment survivor | §B | | | ☐ |
| C — Preference curator | §C | | | ☐ |
| D — Researcher | §D | | | ☐ |
| E — Skeptic | §E | | | ☐ |
| Scope honesty | §F | | | ☐ |
| Engineering | §G | | | ☐ |

---

## §A — Focus seeker (priority #1)

*Less noise while scrolling; reveal always works.*

| ID | Test | Steps | Expected | Auto |
|----|------|-------|----------|------|
| A1 | Wizard-only setup | Fresh profile → complete wizard (Quick start or Focus preset) **without** opening dashboard tabs | Filtering active on first normal page in &lt; 2 min | Manual |
| A2 | Visible text filter | Open Reddit or `tests/fixtures/filtering/core-targets.html` with Focus on | Promo/bait **text** dimmed | E2E / manual |
| A3 | Reveal | Click dimmed block | Content fully visible; stays revealed | E2E |
| A4 | Block reason | Open Filtering tab or popup debug | Reason chip or detector id shown for recent block | Manual |
| A5 | Image-only post | Find image-only post (no caption) on social feed | **No filter applied**; limitation understood | Manual |
| A6 | Meme with caption | Post with short toxic/promo caption meeting scanner threshold | Filtered when text matches rules | Manual |
| A7 | Focus toggle | Popup → Focus off → on | Scanning pauses/resumes | Manual |

**Gate pass:** A1–A4 required; A5 documented (not a failure); A6–A7 recommended.

---

## §B — Comment survivor (priority #2)

*Toxic **language** in comments; honest about images.*

| ID | Test | Steps | Expected | Auto |
|----|------|-------|----------|------|
| B1 | Unwind + toxic pack | Enable Unwind + `adaptation-en-toxic` (or DE) on English comment thread | Insult/outrage **text** dimmed | Manual |
| B2 | Image-only comment | Image-only toxic comment | Unchanged | Manual |
| B3 | Context gating | Enable all EN packs; open `arxiv.org` abstract page | No language packs merged (context empty) | Manual + unit |
| B4 | News + social context | Open `bbc.com/news/...` with EN clickbait pack enabled | Pack applies only if `news` in pack contexts | Unit |

**Gate pass:** B1, B2, B3 required.

---

## §C — Preference curator (priority #3)

*Rules, allowlist, modes without dashboard expertise.*

| ID | Test | Steps | Expected | Auto |
|----|------|-------|----------|------|
| C1 | Block keyword | Rules → add keyword → browse matching page | New matches filtered | Manual |
| C2 | Site allowlist | Whitelist domain → revisit | No filtering; scanner off | Manual |
| C3 | Mode from popup | Switch Focus → Research → Unwind from popup | Sensitivity/rules bundle changes | Manual |
| C4 | Restore defaults | Overview → restore wizard defaults | Focus baseline restored | Manual |

**Gate pass:** C1–C3 required.

---

## §D — Researcher (priority #4)

*Long-form text not wrongly hidden.*

| ID | Test | Steps | Expected | Auto |
|----|------|-------|----------|------|
| D1 | Research mode | Research mode on publisher or arXiv page | No false blocks on abstract/body sample | Manual |
| D2 | Allowlist publisher | Allowlist `arxiv.org` or test publisher | No filtering on that host | Manual |
| D3 | Context-aware packs | EN promo packs enabled on arXiv | Packs **not** active (no ecommerce/social/news context) | Unit |
| D4 | Dogfood FP audit | Run `scripts/filter-audit.mjs` on corpus | Balanced/Research FP within team threshold | Script |

**Gate pass:** D1, D2, D3 required; D4 recommended.

---

## §E — Skeptic (priority #5)

*Opt-in text authenticity.*

| ID | Test | Steps | Expected | Auto |
|----|------|-------|----------|------|
| E1 | Off by default | Fresh install | Authenticity mod disabled | Manual |
| E2 | Select text analyze | Enable assist → select claim → analyze | Report with **fetched** URLs only | Manual + tests |
| E3 | Could not verify | Obscure claim | Clear failure state; no invented URL | Manual |
| E4 | Wizard opt-in | Complete wizard with authenticity unchecked | Assist remains off | Unit |

**Gate pass:** E1, E4 required; E2–E3 **optional under Option A** (authenticity not in v3.0 store hero). Required if authenticity is promoted in listing copy.

---

## §F — Scope honesty

*Text-first boundary; no misinformation marketing.*

| ID | Check | Location | Pass |
|----|-------|----------|------|
| F1 | Text-only limitation in wizard welcome | `wizard.welcome.textOnlyLimitation` | ✅ |
| F2 | FAQ / known limitations mentions image-only gap | [`docs/scope-faq.md`](../scope-faq.md) | ✅ |
| F2b | Link from Filtering tab | `FilteringSettingsPanel` + `store-meta.json` | ✅ |
| F3 | Store listing says “textual noise” not “blocks misinformation” | [`store/listing-chrome.md`](../../store/listing-chrome.md), [`listing-firefox.md`](../../store/listing-firefox.md); `pnpm store:verify:scope` | ☐ submit |
| F4 | Privacy policy: filtering local; authenticity public-only | [`store/PRIVACY.md`](../../store/PRIVACY.md) | ✅ |
| F5 | Adaptation packs described as text patterns | `plugins.adaptationPacks.description` | ✅ |

**Gate pass:** F1–F3 required before listed launch. Audit runbook: [`store/SCOPE-AUDIT.md`](../../store/SCOPE-AUDIT.md).

---

## §G — Engineering gates

| ID | Check | Command / artifact | Pass |
|----|-------|-------------------|------|
| G1 | Unit + integration tests | `pnpm test:scanner` (in `release:preflight`) | ☐ |
| G2 | Core build | `pnpm build:core` | ☐ |
| G3 | CI suite | `pnpm test:ci` / GitHub Actions | ☐ |
| G4 | Scanner E2E | CI e2e job + `test:filter-audit` | ☐ |
| G5 | Firefox QA matrix | [`../guides/firefox-qa.md`](../guides/firefox-qa.md) rows 1–8, 14 | ☐ |
| G6 | Release verify | `pnpm release:verify` (+ Firefox) | ☐ |
| G7 | No dev signing keys in store zip | `release:preflight` / verify-store-build | ☐ |
| G8 | 30-day dogfood on v2.3.x | [`../qa/dogfood-issue-log.md`](../qa/dogfood-issue-log.md) | ☐ |

---

## Automated test map

| Area | Test file(s) |
|------|----------------|
| Adaptation language + context | `tests/adaptation/adaptation-pack-registry.spec.ts` |
| Page context detection | `tests/adaptation/page-context.spec.ts` |
| Pack filters UI | `tests/adaptation/adaptation-pack-filters.spec.ts` |
| Wizard authenticity opt-in | `tests/onboarding/authenticity-opt-in.spec.ts` |
| Core filtering E2E | `tests/core-filtering.spec.ts` |
| Browsing modes | `tests/modes/browsing-modes.spec.ts` |

---

## Structured dogfood (A-R5)

Runbook: [`../qa/dogfood-signoff.md`](../qa/dogfood-signoff.md)

| Step | Command / action |
|------|------------------|
| Preflight | `pnpm dogfood:preflight` |
| Manual sessions | Reddit → BBC News → Rate Your Music (+ arXiv for B3) |
| Record | Per-gate rows in dogfood doc + persona summary table above |

**Required manual gates from dogfood:** A1–A4, B1–B3, C1–C3. §D D1–D3 can reuse RYM/arxiv sessions; D4 via `pnpm test:filter-audit`.

---

## Pre-release workflow

1. Complete Track A + Track C items in [`v3-focused-launch-scope.md`](./v3-focused-launch-scope.md) (Option A).
2. Run `pnpm release:preflight` on release branch (see [`v2.3-release-ops.md`](./v2.3-release-ops.md)).
3. Run `pnpm dogfood:preflight`, then structured dogfood per [`../qa/dogfood-signoff.md`](../qa/dogfood-signoff.md); record pass/fail in sign-off table. (§E E2–E3 optional under Option A.)
4. Fix P0 failures; defer P2 to v3.1+ with known-issues entry.
5. Tag `v3.0.0` only when **required** persona gates pass (A–D, F, G).

---

## Related

- [`ux-capability-roadmap.md`](./ux-capability-roadmap.md) — persona P0/P1 matrix  
- [`version-roadmap.md`](./version-roadmap.md) — Phase 5 exit criteria  
- [`wizard-first-checklist.md`](./wizard-first-checklist.md) — wizard coverage  
- [`../qa/dogfood-signoff.md`](../qa/dogfood-signoff.md) — structured dogfood runbook (A-R5)  
- [`../experimental/visual-analysis.md`](../experimental/visual-analysis.md) — explicitly **not** a v3.0 gate
