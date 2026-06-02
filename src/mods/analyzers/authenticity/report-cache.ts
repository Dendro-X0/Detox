import { sessionGet, sessionSet } from '../../../core/storage/extension-session';
import type { AuthenticityReport } from './types';

const CACHE_PREFIX = 'auth-cache:';

async function hashKey(parts: readonly string[]): Promise<string> {
    const data = new TextEncoder().encode(parts.join('|'));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getCachedReport(scopeText: string, url: string): Promise<AuthenticityReport | null> {
    const key = CACHE_PREFIX + (await hashKey([scopeText, url, 'v1']));
    return (await sessionGet<AuthenticityReport>(key)) ?? null;
}

export async function setCachedReport(scopeText: string, url: string, report: AuthenticityReport): Promise<void> {
    const key = CACHE_PREFIX + (await hashKey([scopeText, url, 'v1']));
    await sessionSet(key, report);
}
