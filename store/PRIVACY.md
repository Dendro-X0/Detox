# SignalLens Privacy Policy

**Last updated:** June 2026  
**Contact:** See the GitHub repository issues page for this project.

SignalLens is a browser extension that helps you filter web content using **your** preferences. This policy describes what data the extension processes and where it goes.

## Summary

- **Default filtering is local.** Keyword matching and pattern detection run on text extracted from pages you visit. No account is required.
- **We do not operate a backend** for core filtering. Settings and stats are stored in your browser (`chrome.storage.local` / `browser.storage.local`).
- **Optional features may send data off-device** only when you enable them and supply your own API keys or endpoints.

## Data processed locally

| Data | Purpose | Storage |
|------|---------|---------|
| Block/allow keywords, browsing modes, policy thresholds | Apply your filtering rules | Browser local storage |
| Scan statistics (counts per page/day) | Dashboard and popup stats | Browser local storage |
| Onboarding and plugin preferences | Extension configuration | Browser local storage |

The extension reads visible page text to discover content blocks for classification. It does not upload page content for core filtering unless you enable optional remote features below.

## Optional features that may leave your device

You control these in **Options → Plugins → Authenticity assist** and related settings:

| Feature | When data leaves device | What is sent |
|---------|-------------------------|--------------|
| **Remote API detector** (full build, opt-in) | Only if you configure an endpoint | Text snippets you classify, per your API contract |
| **Authenticity assist — search** | If enabled with Wikipedia / Brave / custom search | Search queries derived from your selection |
| **Authenticity assist — LLM synthesis** | If enabled with your endpoint + API key | Claims and fetched source snippets you approved for analysis |
| **Local ONNX pack** (full build) | Stays on device | Model inference runs locally |

SignalLens does not sell personal data. Optional third-party services (OpenAI-compatible LLMs, Brave Search, etc.) are governed by **their** policies when you choose to use them.

## Permissions

- **Storage:** Save your settings and statistics.
- **Active tab / scripting / content scripts:** Read page structure and text on sites you visit while the extension is enabled, to apply filtering and optional analysis you request.
- **Context menu:** “Analyze selection” for authenticity assist when you right-click selected text.
- **Side panel:** Show authenticity reports you explicitly request.
- **Offscreen document (Chrome):** Run optional on-device inference for full builds.
- **Host permissions:** Required to inject the content script on web pages you browse. Optional HTTPS hosts support user-configured search and LLM endpoints.

## Data retention

Settings persist until you uninstall the extension or clear extension data. Session-scoped authenticity reports may be stored in `storage.session` and cleared when the browser session ends.

## Children

SignalLens is not directed at children under 13.

## Changes

We may update this policy when optional features or permissions change. The canonical copy lives in the repository at `store/PRIVACY.md`.

## Open source

SignalLens is open source. You can review the code to verify this policy.
