## SignalLens 2.3.0

See [CHANGELOG.md](../CHANGELOG.md) for full notes.

### Install

- **Chrome:** Upload `signallens-chrome-core-2.3.0.zip` to Chrome Web Store (unlisted)
- **Firefox:** Upload `signallens-firefox-core-2.3.0.zip` to AMO (unlisted)

### Highlights

- **Text-filter trust** — accurate scan/filter stats, in-page reveal badge, block reason chips
- **Non-social tuning** — fewer surprise blocks on music and review sites
- **Scope honesty** — wizard + FAQ document text-only filtering; store copy aligned
- **Dogfood ready** — structured QA runbook + automated preflight gates

### Privacy

https://github.com/Dendro-X0/Detox/blob/main/store/PRIVACY.md

### Pre-submit checklist

- [ ] `pnpm release:preflight`
- [ ] `pnpm store:verify:scope`
- [ ] Screenshots per [SCREENSHOTS.md](./SCREENSHOTS.md)
- [ ] Firefox manual QA rows 1–8, 14
