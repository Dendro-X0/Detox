# Store release guide

Package, verify, and publish SignalLens to the Chrome Web Store and Firefox Add-ons (AMO).

→ Checklist: [`../../store/RELEASE-CHECKLIST.md`](../../store/RELEASE-CHECKLIST.md)  
→ Listing copy: [`../../store/listing-chrome.md`](../../store/listing-chrome.md), [`../../store/listing-firefox.md`](../../store/listing-firefox.md)  
→ Privacy policy: [`../../store/PRIVACY.md`](../../store/PRIVACY.md)

## What ships in the **core** store build

The default **`pnpm build`** (core profile) is the recommended first store submission:

- Heuristic keyword filtering + optional noise-pattern detector
- Dim enforcement action
- Browsing modes, options dashboard, onboarding wizard
- Authenticity assist (experimental, off by default)
- **No** bundled ONNX model files (smaller package, faster review)

Full profile (`pnpm build:full`) adds blur/collapse, site hint mods, and ONNX packs — use only after core listing is stable.

## Local release commands

```bash
# Chrome Web Store zip
pnpm release:chrome

# Firefox AMO zip
pnpm release:firefox

# Verify an existing build without re-packaging
pnpm release:verify
pnpm release:verify:firefox
```

Output zips land in `./releases/` (gitignored).

Each release command runs:

1. Production build
2. `scripts/verify-store-build.mjs` — manifest, secrets, trust-key warnings
3. `scripts/package-release.mjs` — versioned zip

## GitHub Releases (automated)

Push a version tag to trigger [`.github/workflows/release.yml`](../../.github/workflows/release.yml):

```bash
git tag v2.0.2
git push origin v2.0.2
```

The workflow runs tests, builds Chrome + Firefox core packages, verifies them, and attaches zips to a GitHub Release using [`store/RELEASE-NOTES-TEMPLATE.md`](../../store/RELEASE-NOTES-TEMPLATE.md).

Edit the template (especially the privacy policy URL) before tagging.

## Version alignment

Keep these in sync before upload:

| File | Field |
|------|--------|
| `package.json` | `version` |
| `src/manifest.json` | `version` (Chrome uses four-part e.g. `2.0.0.1`) |
| `manifest-firefox.json` | `version` |

`verify-store-build.mjs` warns on mismatches.

## Production mod signing keys

Development mod packages are signed with `packages/signing/dev-private.pem`. **Do not ship store builds with the dev trust anchor.**

```bash
pnpm signing:generate
pnpm signing:apply-anchor -- --pem packages/signing/prod-public.pem
pnpm signing:resign -- --private-key packages/signing/prod-private.pem
pnpm release:verify
```

1. Generate a new Ed25519 keypair (keep private key offline or in CI secrets)
2. Replace `MOD_PACKAGE_PUBLIC_KEY_BASE64` in `src/core/mods/trust-anchor.ts` (or use `signing:apply-anchor`)
3. Re-sign packages under `packages/mod-unlocks/` with the production private key
4. Re-run `pnpm release:chrome` and confirm verify step shows no dev-key warning

See [`../../packages/signing/README.md`](../../packages/signing/README.md).

## Store metadata

Privacy policy URL and repo links live in [`../../store/store-meta.json`](../../store/store-meta.json). After editing:

```bash
pnpm store:sync-meta
```

The options dashboard Privacy tab reads the same URL via `src/config/store-links.ts`.

## Chrome Web Store upload

1. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **New item** → upload `releases/signallens-chrome-core-v*.zip`
3. Paste listing from [`listing-chrome.md`](../../store/listing-chrome.md)
4. Host [`PRIVACY.md`](../../store/PRIVACY.md) on GitHub Pages or your docs site; paste URL in the privacy field
5. Complete permission justifications (same doc)
6. Submit for review — consider **Unlisted** for first pass

## Firefox AMO upload

1. [Firefox Developer Hub](https://addons.mozilla.org/developers/)
2. Upload `releases/signallens-firefox-core-v*.zip`
3. Provide source code per [AMO source code submission policy](https://extensionworkshop.com/documentation/publish/source-code-submission/)
4. Paste listing from [`listing-firefox.md`](../../store/listing-firefox.md)
5. Link the same privacy policy URL

Run a manual QA pass on Firefox (popup, options, wizard, sidebar) before submission — see product roadmap **Platform** track.

## Manual smoke test before submit

| Check | Chrome | Firefox |
|-------|--------|---------|
| Load unpacked from `dist` / `dist-firefox` | ✓ | ✓ |
| Enable extension → fixture page filters keywords | ✓ | ✓ |
| Popup browsing modes switch | ✓ | ✓ |
| Options dashboard saves rules | ✓ | ✓ |
| Authenticity off by default | ✓ | ✓ |

## Troubleshooting review rejections

| Issue | Fix |
|-------|-----|
| Broad host permissions | Explain personal filtering requires content script on browsed pages; core does not exfiltrate by default |
| Missing privacy policy | Publish `store/PRIVACY.md` at a stable HTTPS URL |
| Misleading “truth” claims | Use “advisory assist” wording from listing drafts |
| Dev key in bundle | Rotate trust anchor; re-verify zip |

## Related

- [`development.md`](./development.md) — local build profiles
- [`firefox-build.md`](./firefox-build.md) — MV2 specifics
- [`../planning/product-roadmap.md`](../planning/product-roadmap.md) — distribution backlog
