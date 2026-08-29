# Firefox Add-ons (AMO) listing (draft)

Submit the **Firefox core** zip from `releases/signallens-firefox-core-v*.zip`.

**Scope audit:** [`SCOPE-AUDIT.md`](./SCOPE-AUDIT.md) · **FAQ:** [`../docs/scope-faq.md`](../docs/scope-faq.md)

## Summary (≤ 250 characters)

Select text to search, define, and compare while you browse. Reversible dimming quiets promo, bait, and toxic language in page text. Local-first. Image-only posts are not filtered. Optional Verify is off by default.

## Description

Same narrative as [`listing-chrome.md`](./listing-chrome.md). Highlight:

- **Selection Assist** — search / define / compare on highlighted text (opt-in during setup)
- **Text-first** quieting — readable page text only; image-only posts not filtered
- Reveal-first dimming — click to show filtered content
- MV2 background page runtime (no offscreen document on Firefox)
- Sidebar panel for optional Verify reports (`sidebar_action`)
- Core build: local heuristics + dim — no large model download required

## Add-on notes for reviewers

- Content script matches `<all_urls>` to apply mode-based filtering and selection Assist on sites the user visits.
- Assist toolbar and Verify are **disabled by default** until the user opts in (wizard or Options → Assist).
- Core filtering does not upload page text; optional network features are user-initiated.
- Experimental mod packages use Ed25519 signatures; development trust key must be rotated before public listing (see store-release guide).

## Source code

AMO requires source upload for minified builds:

1. Tag release on GitHub (`v*`)
2. Upload matching source archive or link to tag
3. Document build steps from [`docs/guides/store-release.md`](../docs/guides/store-release.md)

## Pre-submit

- [ ] Manual QA on Firefox: popup, options, wizard, sidebar panel
- [ ] `pnpm release:firefox` passes verify step
- [ ] `pnpm store:verify:scope` — listing copy audit
- [ ] Privacy policy URL listed on AMO developer hub (see [`store-meta.json`](./store-meta.json))
- [ ] Screenshots per [`SCREENSHOTS.md`](./SCREENSHOTS.md)
