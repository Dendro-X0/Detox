import { MOD_PACKAGE_FORMAT, type ModPackageManifest, type ModPackagePayload } from './mod-package-types';
import { MOD_PACKAGE_PUBLIC_KEY_BASE64 } from './trust-anchor';

function sortValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) => sortValue(entry));
    }
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(record).sort()) {
            sorted[key] = sortValue(record[key]);
        }
        return sorted;
    }
    return value;
}

export function canonicalizeModPackagePayload(payload: ModPackagePayload): string {
    return JSON.stringify(sortValue(payload));
}

export function manifestToPayload(manifest: ModPackageManifest): ModPackagePayload {
    const { signature: _signature, ...payload } = manifest;
    return payload;
}

let verifyKeyPromise: Promise<CryptoKey> | null = null;

async function getVerifyKey(): Promise<CryptoKey> {
    if (!verifyKeyPromise) {
        const raw = Uint8Array.from(atob(MOD_PACKAGE_PUBLIC_KEY_BASE64), (c) => c.charCodeAt(0));
        verifyKeyPromise = crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
    }
    return verifyKeyPromise;
}

export async function verifyModPackageSignature(manifest: ModPackageManifest): Promise<boolean> {
    if (manifest.format !== MOD_PACKAGE_FORMAT) return false;
    const payload = manifestToPayload(manifest);
    const data = new TextEncoder().encode(canonicalizeModPackagePayload(payload));
    const signature = Uint8Array.from(atob(manifest.signature), (c) => c.charCodeAt(0));
    const key = await getVerifyKey();
    return crypto.subtle.verify({ name: 'Ed25519' }, key, signature, data);
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
