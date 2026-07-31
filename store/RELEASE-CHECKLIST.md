# Release checklist

Complete before Chrome Web Store or Firefox AMO submission.

**v2.3.0 track:** see [`docs/planning/v2.3-release-ops.md`](../docs/planning/v2.3-release-ops.md).  
**Prior RC:** [`docs/planning/v2.2-store-prep.md`](../docs/planning/v2.2-store-prep.md).

## Version and build

- [ ] Bump `package.json` version
- [ ] Align `src/manifest.json` and `manifest-firefox.json` versions
- [ ] Update `CHANGELOG.md`
- [ ] `pnpm release:preflight` green (or `pnpm test:ci` for full CI parity)
- [ ] `pnpm release:chrome` produces zip in `releases/`
- [ ] `pnpm release:firefox` produces zip in `releases/`

## Security and signing

- [ ] Generate production Ed25519 keypair (do **not** commit private key)
- [ ] Update `src/core/mods/trust-anchor.ts` with production public key
- [ ] Re-sign official mod unlock packages if shipping them
- [ ] Confirm no `.pem` files inside zips (`verify-store-build.mjs`)

## Store assets

- [ ] Privacy policy hosted at public URL ([`PRIVACY.md`](./PRIVACY.md))
- [ ] 1280×800 screenshots (see [`listing-chrome.md`](./listing-chrome.md))
- [ ] 128×128 icon (reuse extension icon from build)
- [ ] Store descriptions copied from listing drafts

## Legal and positioning

- [ ] Copy avoids “misinformation confirmed” / medical claims
- [ ] Authenticity assist described as **advisory**
- [ ] Optional remote features disclosed in privacy policy

## Post-publish

- [ ] Tag git release (`git tag v2.0.x && git push origin v2.0.x`) — triggers GitHub Release workflow
- [ ] Attach store build zips to GitHub Release if not using workflow
- [ ] Monitor review feedback; keep unlisted until stable
