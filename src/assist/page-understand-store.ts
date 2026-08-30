import { sessionGet, sessionSet } from '../core/storage/extension-session';
import type { AssistPageUnderstandReport } from './page-outline';

export const ASSIST_PAGE_UNDERSTAND_KEY = 'assistPageUnderstandReport';

export async function savePageUnderstandReport(report: AssistPageUnderstandReport): Promise<void> {
    await sessionSet(ASSIST_PAGE_UNDERSTAND_KEY, report);
}

export async function loadPageUnderstandReport(): Promise<AssistPageUnderstandReport | null> {
    const report = await sessionGet<AssistPageUnderstandReport>(ASSIST_PAGE_UNDERSTAND_KEY);
    return report ?? null;
}
