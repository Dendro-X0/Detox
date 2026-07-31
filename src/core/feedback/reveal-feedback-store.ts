/// <reference types="chrome" />
import { sessionGet, sessionSet } from '../storage/extension-session';
import type { FilteredItemRecord } from '../types/block';

export type BlockFeedback = 'wrong' | 'ok';

export type RevealFeedbackRecord = {
    readonly id: string;
    readonly feedback: BlockFeedback;
    readonly detectorId?: string;
    readonly labelId: string;
    readonly score: number;
    readonly preview: string;
    readonly hostname: string;
    readonly timestamp: number;
};

export type RevealFeedbackStats = {
    readonly wrong: number;
    readonly ok: number;
    readonly byDetector: Readonly<Record<string, { readonly wrong: number; readonly ok: number }>>;
};

const LOCAL_LOG_KEY = 'revealFeedbackLog';
const MAX_LOG_ENTRIES = 200;

export function computeFeedbackStats(log: readonly RevealFeedbackRecord[]): RevealFeedbackStats {
    const byDetector: Record<string, { wrong: number; ok: number }> = {};
    let wrong = 0;
    let ok = 0;

    for (const entry of log) {
        if (entry.feedback === 'wrong') wrong += 1;
        else ok += 1;

        const detectorKey = entry.detectorId ?? 'unknown';
        const bucket = byDetector[detectorKey] ?? { wrong: 0, ok: 0 };
        if (entry.feedback === 'wrong') bucket.wrong += 1;
        else bucket.ok += 1;
        byDetector[detectorKey] = bucket;
    }

    return { wrong, ok, byDetector };
}

export function appendFeedbackRecordToLog(
    log: readonly RevealFeedbackRecord[],
    entry: RevealFeedbackRecord
): readonly RevealFeedbackRecord[] {
    return [entry, ...log.filter((item) => item.id !== entry.id)].slice(0, MAX_LOG_ENTRIES);
}

async function loadFeedbackLog(): Promise<readonly RevealFeedbackRecord[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
    const result = await chrome.storage.local.get(LOCAL_LOG_KEY);
    const log = (result as { readonly revealFeedbackLog?: readonly RevealFeedbackRecord[] }).revealFeedbackLog;
    return Array.isArray(log) ? log : [];
}

async function saveFeedbackLog(log: readonly RevealFeedbackRecord[]): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [LOCAL_LOG_KEY]: log });
}

export async function loadRevealFeedbackStats(): Promise<RevealFeedbackStats> {
    const log = await loadFeedbackLog();
    return computeFeedbackStats(log);
}

export async function submitBlockFeedback(
    item: Pick<
        FilteredItemRecord,
        'id' | 'detectorId' | 'labelId' | 'score' | 'preview' | 'hostname'
    >,
    feedback: BlockFeedback
): Promise<void> {
    const entry: RevealFeedbackRecord = {
        id: item.id,
        feedback,
        detectorId: item.detectorId,
        labelId: item.labelId,
        score: item.score,
        preview: item.preview,
        hostname: item.hostname,
        timestamp: Date.now(),
    };

    const log = appendFeedbackRecordToLog(await loadFeedbackLog(), entry);
    await saveFeedbackLog(log);
    await markBlockedItemFeedback(item.id, feedback);
}

export async function markBlockedItemRevealed(blockId: string): Promise<void> {
    const existing = (await sessionGet<readonly FilteredItemRecord[]>('blockedItems')) ?? [];
    if (existing.length === 0) return;

    const updated = existing.map((item) =>
        item.id === blockId ? { ...item, revealed: true as const } : item
    );
    await sessionSet('blockedItems', updated);
}

async function markBlockedItemFeedback(blockId: string, feedback: BlockFeedback): Promise<void> {
    const existing = (await sessionGet<readonly FilteredItemRecord[]>('blockedItems')) ?? [];
    if (existing.length === 0) return;

    const updated = existing.map((item) =>
        item.id === blockId ? { ...item, revealed: true as const, feedback } : item
    );
    await sessionSet('blockedItems', updated);
}
