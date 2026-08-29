import { consumeAssistActionQuota, loadAssistQuota } from './assist-quota-store';
import { loadAssistSettings } from './assist-settings-store';
import { fetchDefinePreview } from './define-preview';
import { readHandoffCache, writeHandoffCache } from './handoff-cache';
import {
    beginAssistNetworkJob,
    finishAssistNetworkJob,
} from './network-job';
import {
    buildCompareReport,
    loadCompareReport,
    saveCompareReport,
} from './compare-report';
import {
    buildSearchUrl,
    buildWikipediaDefineUrl,
} from './search-urls';
import type { AssistSettings } from './types';

export type AssistActionResult = {
    readonly ok: boolean;
    readonly error?: string;
    readonly cached?: boolean;
    readonly excerpt?: string;
    readonly urls?: readonly string[];
};

export const ASSIST_QUOTA_ERROR = 'assist.quota.exhausted';
export const ASSIST_CACHE_HIT = 'assist.cache.recentHandoff';

async function ensureQuota(settings: AssistSettings): Promise<AssistActionResult | null> {
    await loadAssistQuota();
    const allowed = await consumeAssistActionQuota(settings);
    if (!allowed) {
        return { ok: false, error: ASSIST_QUOTA_ERROR };
    }
    return null;
}

export async function prepareSearchHandoff(
    text: string,
    settings: AssistSettings
): Promise<AssistActionResult> {
    const cached = await readHandoffCache('search', text);
    if (cached) {
        return {
            ok: true,
            cached: true,
            urls: cached.urls,
            excerpt: cached.excerpt,
            error: ASSIST_CACHE_HIT,
        };
    }

    const blocked = await ensureQuota(settings);
    if (blocked) return blocked;

    const url = buildSearchUrl(text, settings);
    await writeHandoffCache('search', text, { urls: [url], openedAt: Date.now() });
    return { ok: true, urls: [url] };
}

export async function prepareDefineHandoff(text: string): Promise<AssistActionResult> {
    const cached = await readHandoffCache('define', text);
    if (cached) {
        return {
            ok: true,
            cached: true,
            urls: cached.urls,
            excerpt: cached.excerpt,
            error: ASSIST_CACHE_HIT,
        };
    }

    const settings = await loadAssistSettings();
    const blocked = await ensureQuota(settings);
    if (blocked) return blocked;

    const signal = beginAssistNetworkJob('define');
    try {
        const preview = await fetchDefinePreview(text, fetch, signal);
        finishAssistNetworkJob();

        const url = preview?.url ?? buildWikipediaDefineUrl(text);
        const excerpt = preview?.excerpt;
        await writeHandoffCache('define', text, {
            urls: [url],
            openedAt: Date.now(),
            excerpt,
        });
        return { ok: true, urls: [url], excerpt };
    } catch (error) {
        finishAssistNetworkJob();
        const message = error instanceof Error ? error.message : 'Define failed';
        if (message === 'cancelled') {
            return { ok: false, error: 'assist.job.cancelled' };
        }
        const url = buildWikipediaDefineUrl(text);
        await writeHandoffCache('define', text, { urls: [url], openedAt: Date.now() });
        return { ok: true, urls: [url] };
    }
}

export async function prepareComparePanel(
    text: string,
    clip: string,
    settings: AssistSettings
): Promise<AssistActionResult> {
    const cacheKey = `${clip}\n---\n${text}`;
    const cached = await readHandoffCache('compare', cacheKey);
    const existing = await loadCompareReport();
    if (
        cached &&
        existing &&
        existing.sideA.text === clip &&
        existing.sideB.text === text
    ) {
        return {
            ok: true,
            cached: true,
            urls: [existing.combinedSearchUrl],
            error: ASSIST_CACHE_HIT,
        };
    }

    const blocked = await ensureQuota(settings);
    if (blocked) return blocked;

    const signal = beginAssistNetworkJob('compare');
    try {
        const report = await buildCompareReport(clip, text, settings, fetch, signal);
        finishAssistNetworkJob();
        await saveCompareReport(report);
        await writeHandoffCache('compare', cacheKey, {
            urls: [report.combinedSearchUrl],
            openedAt: Date.now(),
        });
        return { ok: true, urls: [report.combinedSearchUrl] };
    } catch (error) {
        finishAssistNetworkJob();
        const message = error instanceof Error ? error.message : 'Compare failed';
        if (message === 'cancelled') {
            return { ok: false, error: 'assist.job.cancelled' };
        }
        const report = await buildCompareReport(clip, text, settings);
        await saveCompareReport(report);
        await writeHandoffCache('compare', cacheKey, {
            urls: [report.combinedSearchUrl],
            openedAt: Date.now(),
        });
        return { ok: true, urls: [report.combinedSearchUrl] };
    }
}

/** @deprecated Use prepareComparePanel — opens side-by-side report instead of tabs. */
export async function prepareCompareHandoff(
    text: string,
    clip: string,
    settings: AssistSettings
): Promise<AssistActionResult> {
    return prepareComparePanel(text, clip, settings);
}
