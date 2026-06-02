/// <reference types="chrome" />
import { AUTHENTICITY_CONTEXT_MENU_ID } from './mods/analyzers/authenticity/constants';
import type { AuthenticityMessage } from './mods/analyzers/authenticity/messages';
import {
    consumeAuthenticityQuota,
    getAuthenticitySettings,
    loadAuthenticitySettings,
} from './mods/analyzers/authenticity/settings-store';
import {
    getAuthenticityJob,
    requestCancelAuthenticityJob,
    runAuthenticityAnalysis,
} from './mods/analyzers/authenticity/pipeline';
import { buildAnalysisScope, detectSiteId } from './mods/analyzers/authenticity/scope-resolver';
import { openAuthenticityPanel } from './authenticity/open-panel';
import { sessionSet } from './core/storage/extension-session';
import { AUTHENTICITY_JOB_STORAGE_KEY } from './mods/analyzers/authenticity/constants';

export function installAuthenticityContextMenu(): void {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: AUTHENTICITY_CONTEXT_MENU_ID,
            title: 'Analyze selection with SignalLens',
            contexts: ['selection'],
        });
    });
}

async function handleAnalyze(message: Extract<AuthenticityMessage, { type: 'authenticity:analyze' }>): Promise<{
    readonly ok: boolean;
    readonly error?: string;
}> {
    await loadAuthenticitySettings();
    const settings = getAuthenticitySettings();
    if (!settings.enabled) {
        return { ok: false, error: 'Authenticity assist is disabled. Enable it in Options → Authenticity.' };
    }

    const allowed = await consumeAuthenticityQuota();
    if (!allowed) {
        return { ok: false, error: 'Daily analysis quota reached. Adjust quota in Options.' };
    }

    const siteId = detectSiteId(message.hostname);
    const scope = buildAnalysisScope(message.scopeRequest, message.hostname, message.selectionText);

    try {
        const report = await runAuthenticityAnalysis({
            scope,
            url: message.url,
            siteId,
            title: message.pageTitle,
            searchOnly: message.searchOnly,
        });

        const status = report.assessments[0]?.epistemicStatus ?? 'unknown';
        chrome.tabs.sendMessage(message.tabId, {
            type: 'authenticity:showFlag',
            blockId: scope.kind === 'selection' ? scope.blockId : undefined,
            status,
        } satisfies { type: 'authenticity:showFlag'; blockId?: string; status: string });

        return { ok: true };
    } catch (error) {
        const err = error instanceof Error ? error.message : 'Analysis failed';
        const current = await getAuthenticityJob();
        await sessionSet(AUTHENTICITY_JOB_STORAGE_KEY, {
            jobId: current?.jobId ?? 'job-error',
            phase: 'error',
            progress: 0,
            message: err,
            report: null,
            error: err,
        });
        if (err === 'cancelled') {
            return { ok: false, error: 'Analysis cancelled' };
        }
        return { ok: false, error: err };
    }
}

export function registerAuthenticityBackgroundHandlers(): void {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId !== AUTHENTICITY_CONTEXT_MENU_ID || !tab?.id) return;
        const selection = info.selectionText?.trim();
        if (!selection) return;
        void (async () => {
            const tabId = tab.id;
            if (tabId === undefined) return;
            await openAuthenticityPanel(tabId);
            const url = tab.url ?? '';
            const hostname = url ? new URL(url).hostname : '';
            await handleAnalyze({
                type: 'authenticity:analyze',
                tabId,
                scopeRequest: { kind: 'selection', text: selection },
                selectionText: selection,
                pageTitle: tab.title ?? '',
                url,
                hostname,
            });
        })();
    });

    chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
        if (!message || typeof message !== 'object' || !('type' in message)) return;

        const typed = message as AuthenticityMessage;

        if (typed.type === 'authenticity:openPanel') {
            const tabId = sender.tab?.id;
            if (tabId) void openAuthenticityPanel(tabId);
            sendResponse({ ok: true });
            return true;
        }

        if (typed.type === 'authenticity:getJob') {
            void getAuthenticityJob().then((job) => {
                sendResponse({ type: 'authenticity:jobState', job } satisfies AuthenticityMessage);
            });
            return true;
        }

        if (typed.type === 'authenticity:cancel') {
            requestCancelAuthenticityJob();
            sendResponse({ ok: true });
            return true;
        }

        if (typed.type === 'authenticity:analyze') {
            const tabId = sender.tab?.id ?? typed.tabId;
            void (async () => {
                const tab = await chrome.tabs.get(tabId);
                const result = await handleAnalyze({
                    ...typed,
                    tabId,
                    pageTitle: typed.pageTitle || tab.title || '',
                    url: typed.url || tab.url || '',
                    hostname: typed.hostname || (tab.url ? new URL(tab.url).hostname : ''),
                });
                sendResponse({ type: 'authenticity:analyzeResult', ...result });
            })();
            return true;
        }

        return undefined;
    });
}
