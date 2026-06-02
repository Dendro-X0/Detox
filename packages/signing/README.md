# Mod package signing (development)

SignalLens mod packages use format `signallens-mod/1` and Ed25519 signatures.

## Development trust anchor

The public key in `src/core/mods/trust-anchor.ts` matches `dev-private.pem` in this folder.

**Do not ship this private key in production releases.** Replace both keys before publishing a store build.

## Sign packages

```bash
node scripts/sign-mod-package.mjs packages/mod-unlocks/src/adapter-reddit.payload.json
```

Writes a signed manifest next to the payload (`adapter-reddit.signallens-mod.json`).

## Install in the extension

1. Build core: `pnpm build`
2. Options → Plugin Library → **Install package**
3. Select a `.signallens-mod.json` file (or use **Install from URL** for hosted manifests)
4. Enable the mod toggle

Unlock packages only enable mods that are already bundled as lazy chunks in the extension CRX.
