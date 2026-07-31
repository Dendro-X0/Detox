# Store scope honesty audit (§F)

> **Track A-R4** — Verify launch copy and in-product messaging match Option A boundaries.  
> **Gate:** [`docs/planning/v3-acceptance-checklist.md`](../docs/planning/v3-acceptance-checklist.md) §F  
> **User FAQ:** [`docs/scope-faq.md`](../docs/scope-faq.md)

Run before v3.0.0 listed submit:

```bash
pnpm store:verify:scope
```

---

## §F checklist

| ID | Check | Location | Pass |
|----|-------|----------|------|
| **F1** | Text-only limitation in wizard welcome | `wizard.welcome.textOnlyLimitation` in `src/i18n/locales/en.json` (+ `de.json`) | ✅ |
| **F2** | FAQ / known limitations (image-only gap) | [`docs/scope-faq.md`](../docs/scope-faq.md) | ✅ |
| **F2b** | Link from Filtering tab | `FilteringSettingsPanel` → scope FAQ URL via `store-meta.json` | ✅ |
| **F3** | Store listing: “textual noise”, not “misinformation” | [`listing-chrome.md`](./listing-chrome.md), [`listing-firefox.md`](./listing-firefox.md) | ☐ submit |
| **F4** | Privacy: filtering local; authenticity public-only | [`PRIVACY.md`](./PRIVACY.md) | ✅ |
| **F5** | Adaptation packs = text patterns | `plugins.adaptationPacks.description` in locale files | ✅ |

---

## Required messaging (Option A)

| Surface | Must include |
|---------|----------------|
| Wizard welcome | Page text only; image-only posts not filtered |
| Scope FAQ | Image-only gap; no misinformation auto-block |
| Chrome short description | Textual / language noise; reversible |
| Chrome detailed description | Reveal-first; text scope; authenticity experimental |
| Firefox summary | Same narrative as Chrome |

## Forbidden claims (automated scan)

`scripts/verify-store-scope.mjs` fails if listing drafts contain:

- `blocks misinformation` / `fight misinformation`
- `fact-check your feed` / `fact check your feed`
- `analyzes images` / `analyze images`
- `blocks false` / `block false information`

Warnings (review manually):

- `research assist` in short description without “optional” / “experimental” nearby
- `authenticity` as first bullet under “What it does”

---

## Sign-off

| Field | Value |
|-------|--------|
| Version audited | |
| Chrome listing reviewed | ☐ |
| Firefox listing reviewed | ☐ |
| `pnpm store:verify:scope` | ☐ |
| Reviewer | |
| Date | |
