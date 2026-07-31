# Firefox Add-ons (AMO) listing (draft)

Submit the **Firefox core** zip from `releases/signallens-firefox-core-v*.zip`.

**Scope audit:** [`SCOPE-AUDIT.md`](./SCOPE-AUDIT.md) · **FAQ:** [`../docs/scope-faq.md`](../docs/scope-faq.md)

## Summary (≤ 250 characters)

Reduce textual noise on the web — promo, bait, toxic language. Reveal-first dimming with your local keyword rules. Image-only posts are not filtered. Optional authenticity assist is off by default.

## Description

Same narrative as [`listing-chrome.md`](./listing-chrome.md). Highlight:

- **Text-first** filtering — readable page text only; image-only posts not filtered
- Reveal-first dimming — click to show filtered content
- MV2 background page runtime (no offscreen document on Firefox)
- Sidebar panel for optional authenticity reports (`sidebar_action`)
- Core build: heuristic keywords + dim — no large model download required

## Add-on notes for reviewers

- Content script matches `<all_urls>` to apply user-configured filtering on any site they visit.
- Authenticity assist is **disabled by default**; enabling it may call user-configured HTTPS endpoints only.
- Core filtering does not upload page text; optional features are user-initiated.
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
