import { sessionGet, sessionSet } from '../core/storage/extension-session';

export type AssistHandoffAction = 'search' | 'define' | 'compare';

export type HandoffCacheEntry = {
    readonly urls: readonly string[];
    readonly openedAt: number;
    readonly excerpt?: string;
};

const CACHE_KEY = 'assistHandoffCache';
const HANDOFF_TTL_MS = 5 * 60 * 1000;

type HandoffCacheMap = Record<string, HandoffCacheEntry>;

function normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function handoffCacheKey(action: AssistHandoffAction, text: string): string {
    return `${action}:${normalizeText(text)}`;
}

export function isHandoffCacheFresh(entry: HandoffCacheEntry, now = Date.now()): boolean {
    return now - entry.openedAt < HANDOFF_TTL_MS;
}

export async function readHandoffCache(
    action: AssistHandoffAction,
    text: string
): Promise<HandoffCacheEntry | null> {
    const map = (await sessionGet<HandoffCacheMap>(CACHE_KEY)) ?? {};
    const entry = map[handoffCacheKey(action, text)];
    if (!entry || !isHandoffCacheFresh(entry)) return null;
    return entry;
}

export async function writeHandoffCache(
    action: AssistHandoffAction,
    text: string,
    entry: HandoffCacheEntry
): Promise<void> {
    const map = (await sessionGet<HandoffCacheMap>(CACHE_KEY)) ?? {};
    map[handoffCacheKey(action, text)] = entry;
    await sessionSet(CACHE_KEY, map);
}

/** @internal tests */
export function pruneHandoffCache(map: HandoffCacheMap, now = Date.now()): HandoffCacheMap {
    const next: HandoffCacheMap = {};
    for (const [key, entry] of Object.entries(map)) {
        if (isHandoffCacheFresh(entry, now)) next[key] = entry;
    }
    return next;
}
