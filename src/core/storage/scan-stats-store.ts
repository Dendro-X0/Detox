/// <reference types="chrome" />
import { getSessionAreaName, sessionGet, sessionSet } from './extension-session';

export type PageScanStats = {
    readonly pageKey: string;
    readonly discovered: number;
    readonly scanned: number;
    readonly filtered: number;
};

export type PeriodScanStats = {
    readonly scanned: number;
    readonly filtered: number;
};

export type ScanStatsSnapshot = {
    readonly page: PageScanStats;
    readonly today: PeriodScanStats;
    readonly last7Days: PeriodScanStats;
};

type PageStatsRecord = {
    pageKey: string;
    discovered: number;
    scanned: number;
    filtered: number;
};

type RollupStorageRecord = {
    readonly scanStatsRollup?: {
        readonly days: Record<string, { readonly scanned: number; readonly filtered: number }>;
    };
};

const PAGE_STATS_SESSION_KEY = 'scanStatsPage';
const ROLLUP_LOCAL_KEY = 'scanStatsRollup';
const LEGACY_STATS_KEY = 'stats';

function todayKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

function last7DayKeys(date = new Date()): readonly string[] {
    const keys: string[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
        const day = new Date(date);
        day.setUTCDate(day.getUTCDate() - offset);
        keys.push(todayKey(day));
    }
    return keys;
}

function emptyPage(pageKey: string): PageStatsRecord {
    return { pageKey, discovered: 0, scanned: 0, filtered: 0 };
}

async function readPageStats(): Promise<PageStatsRecord> {
    const localResult = await chrome.storage.local.get(PAGE_STATS_SESSION_KEY);
    const fromLocal = localResult[PAGE_STATS_SESSION_KEY] as PageStatsRecord | undefined;
    if (fromLocal?.pageKey) return fromLocal;

    const stored = await sessionGet<PageStatsRecord>(PAGE_STATS_SESSION_KEY);
    if (!stored) return emptyPage('');
    return stored;
}

async function writePageStats(page: PageStatsRecord): Promise<void> {
    await chrome.storage.local.set({
        [PAGE_STATS_SESSION_KEY]: page,
        [LEGACY_STATS_KEY]: { scanned: page.scanned, toxic: page.filtered },
    });
    await sessionSet(PAGE_STATS_SESSION_KEY, page);
}

async function readRollupDays(): Promise<Record<string, { scanned: number; filtered: number }>> {
    const result = await chrome.storage.local.get(ROLLUP_LOCAL_KEY);
    const record = result as RollupStorageRecord;
    return { ...(record.scanStatsRollup?.days ?? {}) };
}

export async function resetPageScanStats(pageKey: string): Promise<void> {
    const page = emptyPage(pageKey);
    await writePageStats(page);
}

export async function recordBlocksDiscovered(count: number, pageKey: string): Promise<void> {
    if (count <= 0) return;
    const page = await readPageStats();
    const next =
        page.pageKey === pageKey
            ? { ...page, discovered: page.discovered + count }
            : { ...emptyPage(pageKey), discovered: count };
    await writePageStats(next);
}

export async function recordBlocksScanned(
    scannedDelta: number,
    filteredDelta: number,
    pageKey: string
): Promise<void> {
    if (scannedDelta <= 0 && filteredDelta <= 0) return;

    const page = await readPageStats();
    const base = page.pageKey === pageKey ? page : emptyPage(pageKey);
    const next: PageStatsRecord = {
        ...base,
        scanned: base.scanned + scannedDelta,
        filtered: base.filtered + filteredDelta,
    };

    const day = todayKey();
    const days = await readRollupDays();
    const bucket = days[day] ?? { scanned: 0, filtered: 0 };
    days[day] = {
        scanned: bucket.scanned + scannedDelta,
        filtered: bucket.filtered + filteredDelta,
    };

    await chrome.storage.local.set({
        [PAGE_STATS_SESSION_KEY]: next,
        [LEGACY_STATS_KEY]: { scanned: next.scanned, toxic: next.filtered },
        [ROLLUP_LOCAL_KEY]: { days },
    });
    await sessionSet(PAGE_STATS_SESSION_KEY, next);
}

export async function getRollupSnapshot(): Promise<{ readonly today: PeriodScanStats; readonly last7Days: PeriodScanStats }> {
    const days = await readRollupDays();
    const today = days[todayKey()] ?? { scanned: 0, filtered: 0 };
    let last7Scanned = 0;
    let last7Filtered = 0;
    for (const key of last7DayKeys()) {
        const bucket = days[key];
        if (!bucket) continue;
        last7Scanned += bucket.scanned;
        last7Filtered += bucket.filtered;
    }
    return { today, last7Days: { scanned: last7Scanned, filtered: last7Filtered } };
}

export async function getPageStatsFromSession(): Promise<PageScanStats | null> {
    const page = await readPageStats();
    if (!page.pageKey) return null;
    return page;
}

export async function getScanStatsSnapshot(pageKey: string): Promise<ScanStatsSnapshot> {
    const pageStored = await readPageStats();
    const page: PageScanStats =
        pageStored.pageKey === pageKey
            ? pageStored
            : { pageKey, discovered: 0, scanned: 0, filtered: 0 };

    const days = await readRollupDays();
    const today = days[todayKey()] ?? { scanned: 0, filtered: 0 };
    let last7Scanned = 0;
    let last7Filtered = 0;
    for (const key of last7DayKeys()) {
        const bucket = days[key];
        if (!bucket) continue;
        last7Scanned += bucket.scanned;
        last7Filtered += bucket.filtered;
    }

    return {
        page,
        today,
        last7Days: { scanned: last7Scanned, filtered: last7Filtered },
    };
}

export function subscribeScanStatsChanges(
    listener: (changes: Record<string, chrome.storage.StorageChange>) => void
): () => void {
    const sessionArea = getSessionAreaName();
    const handler = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string
    ): void => {
        if (areaName === sessionArea && changes[PAGE_STATS_SESSION_KEY]) {
            listener(changes);
            return;
        }
        if (areaName === 'local' && (changes[LEGACY_STATS_KEY] || changes[ROLLUP_LOCAL_KEY] || changes[PAGE_STATS_SESSION_KEY])) {
            listener(changes);
        }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
}

/** @deprecated Use session page stats; clears only the active page bucket. */
export async function clearLegacyGlobalStats(): Promise<void> {
    await chrome.storage.local.set({ [LEGACY_STATS_KEY]: { scanned: 0, toxic: 0 } });
}
