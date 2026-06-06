/**
 * Ed25519 public key for verifying official SignalLens mod packages.
 * Production store builds use the key paired with `packages/signing/prod-private.pem`
 * (gitignored). Development packages use `dev-private.pem` — see `packages/signing/README.md`.
 */
export const MOD_PACKAGE_PUBLIC_KEY_BASE64 = 'WFpMdu+EAVBQV05y1373Nt1h6aa7bq8785RBgj/6DFM=';
