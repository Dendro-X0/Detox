import { createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Raw 32-byte Ed25519 public key as base64 (matches Web Crypto `importKey('raw', …)`). */
export function publicKeyBase64FromPem(pemOrPath) {
    const pem = pemOrPath.includes('-----BEGIN') ? pemOrPath : readFileSync(pemOrPath, 'utf8');
    const key = createPublicKey(pem);
    const der = key.export({ format: 'der', type: 'spki' });
    return der.subarray(-32).toString('base64');
}
