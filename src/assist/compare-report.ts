import { sessionGet, sessionSet } from '../core/storage/extension-session';
import { fetchDefinePreview } from './define-preview';
import { analyzeSnippetOverlap } from './compare-overlap';
import { buildCompareSearchUrl } from './search-urls';
import type { AssistCompareReport, CompareSnippetSide } from './compare-overlap';
import type { AssistSettings } from './types';

export const ASSIST_COMPARE_REPORT_KEY = 'assistCompareReport';

function newReportId(): string {
    return `compare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sideFromPreview(
    text: string,
    label: CompareSnippetSide['label'],
    preview: Awaited<ReturnType<typeof fetchDefinePreview>>
): CompareSnippetSide {
    return {
        text,
        label,
        title: preview?.title,
        url: preview?.url,
        excerpt: preview?.excerpt,
    };
}

export async function buildCompareReport(
    clip: string,
    selection: string,
    settings: AssistSettings,
    fetchImpl: typeof fetch = fetch,
    signal?: AbortSignal
): Promise<AssistCompareReport> {
    const [previewA, previewB] = await Promise.all([
        fetchDefinePreview(clip, fetchImpl, signal),
        fetchDefinePreview(selection, fetchImpl, signal),
    ]);

    const sideA = sideFromPreview(clip, 'clip', previewA);
    const sideB = sideFromPreview(selection, 'selection', previewB);
    const overlap = analyzeSnippetOverlap(clip, selection);

    return {
        id: newReportId(),
        createdAt: Date.now(),
        sideA,
        sideB,
        overlap,
        combinedSearchUrl: buildCompareSearchUrl(clip, selection, settings),
    };
}

export async function saveCompareReport(report: AssistCompareReport): Promise<void> {
    await sessionSet(ASSIST_COMPARE_REPORT_KEY, report);
}

export async function loadCompareReport(): Promise<AssistCompareReport | null> {
    const report = await sessionGet<AssistCompareReport>(ASSIST_COMPARE_REPORT_KEY);
    return report ?? null;
}
