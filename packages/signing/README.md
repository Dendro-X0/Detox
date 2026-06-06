# Mod package signing (development)

SignalLens mod packages use format `signallens-mod/1` and Ed25519 signatures.

## Development trust anchor

The public key in `src/core/mods/trust-anchor.ts` matches `dev-private.pem` in this folder.

**Do not ship this private key in production releases.** Replace both keys before publishing a store build.

## Sign packages (development key)

```bash
node scripts/sign-mod-package.mjs packages/mod-unlocks/src/adapter-reddit.payload.json
```

Writes `packages/mod-unlocks/adapter-reddit.signallens-mod.json`.

Optional production key:

```bash
node scripts/sign-mod-package.mjs packages/mod-unlocks/src/adapter-reddit.payload.json \
  --private-key packages/signing/prod-private.pem
```

## Production key rotation (v2.2.0)

Run locally — private key stays gitignored.

```bash
# 1. Generate prod keypair (packages/signing/prod-*.pem)
node scripts/generate-mod-signing-key.mjs

# 2. Update trust anchor in source
node scripts/apply-mod-trust-anchor.mjs --pem packages/signing/prod-public.pem

# 3. Re-sign bundled unlock manifests
node scripts/resign-mod-packages.mjs --private-key packages/signing/prod-private.pem

# 4. Verify store build no longer warns about dev key
pnpm release:verify
```

Keep `prod-private.pem` offline or in CI secrets only.

**Important:** Back up `packages/signing/prod-private.pem` after generation — it is gitignored and required to sign future mod packages.

## Install in the extension

1. Build core: `pnpm build`
2. Options → Plugin Library → **Install package**
3. Select a `.signallens-mod.json` file (or use **Install from URL** for hosted manifests)
4. Enable the mod toggle

Unlock packages only enable mods that are already bundled as lazy chunks in the extension CRX.
