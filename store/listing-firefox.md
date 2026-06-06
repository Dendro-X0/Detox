# Firefox Add-ons (AMO) listing (draft)

Submit the **Firefox core** zip from `releases/signallens-firefox-core-v*.zip`.

## Summary (≤ 250 characters)

SignalLens helps you browse with focus using personal keyword rules and browsing modes. Filters are reversible. Optional authenticity research assist (off by default).

## Description

Same narrative as [`listing-chrome.md`](./listing-chrome.md). Highlight:

- MV2 background page runtime (no offscreen document on Firefox)
- Sidebar panel for authenticity reports (`sidebar_action`)
- Core build: heuristic keywords + dim — no large model download required

## Add-on notes for reviewers

- Content script matches `<all_urls>` to apply user-configured filtering on any site they visit.
- Authenticity assist is **disabled by default**; enabling it may call user-configured HTTPS endpoints only.
- Experimental mod packages use Ed25519 signatures; development trust key must be rotated before public listing (see store-release guide).

## Source code

AMO requires source upload for minified builds:

1. Tag release on GitHub (`v*`)
2. Upload matching source archive or link to tag
3. Document build steps from [`docs/guides/store-release.md`](../docs/guides/store-release.md)

## Pre-submit

- [ ] Manual QA on Firefox: popup, options, wizard, sidebar panel
- [ ] `pnpm release:firefox` passes verify step
- [ ] Privacy policy URL listed on AMO developer hub (see [`store-meta.json`](./store-meta.json))
- [ ] Screenshots per [`SCREENSHOTS.md`](./SCREENSHOTS.md)
