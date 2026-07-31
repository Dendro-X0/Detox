# Adaptation pack authoring

Adaptation packs add **local** language/context supplements to SignalLens filtering — keyword phrases, noise patterns, behavior weight boosts, and DOM markers. They never upload or store page content.

## Quick start

```bash
# 1. Create a new pack directory
pnpm adaptation:scaffold fr-promo --language fr --context ecommerce --content-type promotional

# 2. Edit rules
#    packages/adaptation-packs/adaptation-fr-promo/pack.json
#    packages/adaptation-packs/adaptation-fr-promo/mod.meta.json

# 3. Validate
pnpm adaptation:validate packages/adaptation-packs/adaptation-fr-promo

# 4. Sign (single-file install manifest)
pnpm adaptation:build packages/adaptation-packs/adaptation-fr-promo
```

Install the generated `.signallens-mod.json` via **Dashboard → Plugins → Install package**, then enable the pack under **Adaptation packs**.

## File layout

| File | Purpose |
|------|---------|
| `pack.json` | Rules (`signallens-adaptation/1`) — keywords, patterns, boosts |
| `mod.meta.json` | Library metadata — name, languages, contexts, privacy summary |
| `*.signallens-mod.json` | Signed output (embeds `pack.json` inline — no download URL) |

Copy `_template/` as a starting point.

## pack.json schema

Required:

- `format`: `"signallens-adaptation/1"`
- `packId`: must match `modId` (`adaptation-<slug>`)
- `version`: semver `x.y.z`
- `privacy`: all three flags **must** be `false`
  - `networkAccess`
  - `persistsPageContent`
  - `telemetry`

Optional rule sections (at least one required):

- `languages`: BCP-47 codes or `"*"` for all languages
- `contexts`: e.g. `social-feed`, `news`, `ecommerce`
- `contentTypes`: `promotional`, `clickbait`, `phishing`, `toxic` (required in mod.meta.json for catalog filtering)
- `supplementalKeywords`: string array
- `noisePatterns`: `{ promo, outrage, engagement-bait }` string arrays
- `behaviorWeightBoosts`: signal id → `(0, 0.15]` boost
- `domPromotedMarkers`: substring markers for sponsored DOM hints

## Privacy contract

Packages that set any `privacy.*` field to `true` are **rejected** at validation and install time. Scan/filter text is processed in real time on-device; adaptation data is static pattern lists only.

## Signing

Uses the same Ed25519 dev key as mod unlock packages (`packages/signing/dev-private.pem`).

Production:

```bash
node scripts/build-adaptation-mod-package.mjs packages/adaptation-packs/adaptation-fr-promo \
  --private-key packages/signing/prod-private.pem
```

## Bundled vs community packs

- **Bundled** packs ship inside the extension CRX (`src/mods/adaptation-packs/bundled/`).
- **Community** packs use `modId`s not in the bundled catalog; they appear in the library after install.
