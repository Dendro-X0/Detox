/// <reference types="chrome" />
import { openAuthenticityPanel } from '../authenticity/open-panel';
import { getAuthenticitySettings, loadAuthenticitySettings } from '../mods/analyzers/authenticity/settings-store';
import { loadAssistSettings } from './assist-settings-store';
import { clearCompareClip, loadCompareClip, saveCompareClip } from './compare-clip-store';
import { ASSIST_MENU } from './types';
import type { AssistRuntimeMessage } from './types';
import {
    buildCompareSearchUrl,
    buildSearchUrl,
    buildWikipediaDefineUrl,
} from './search-urls';

async function openUrl(url: string): Promise<void> {
    await chrome.tabs.create({ url });
}

async function runSearch(text: string): Promise<void> {
    const settings = await loadAssistSettings();
    await openUrl(buildSearchUrl(text, settings));
}

async function runDefine(text: string): Promise<void> {
    await openUrl(buildWikipediaDefineUrl(text));
}

async function runCompare(text: string): Promise<{ readonly ok: boolean; readonly error?: string }> {
    const clip = await loadCompareClip();
    if (!clip) {
        return { ok: false, error: 'No saved clip. Choose “Save as compare clip” on the first snippet first.' };
    }
    const settings = await loadAssistSettings();
    await openUrl(buildSearchUrl(clip, settings));
    await openUrl(buildSearchUrl(text, settings));
    await openUrl(buildCompareSearchUrl(clip, text, settings));
    return { ok: true };
}

async function runVerify(tabId: number, text: string): Promise<{ readonly ok: boolean; readonly error?: string }> {
    await loadAuthenticitySettings();
    if (!getAuthenticitySettings().enabled) {
        return {
            ok: false,
            error: 'Verify is off. Enable Authenticity assist under Options → Plugins (advanced).',
        };
    }
    await openAuthenticityPanel(tabId);
    try {
        await chrome.tabs.sendMessage(tabId, {
            type: 'authenticity:analyze',
            selectionText: text,
            scopeRequest: { kind: 'selection', text },
        });
    } catch {
        return {
            ok: false,
            error: 'Could not reach this page. Reload the tab and try again.',
        };
    }
    return { ok: true };
}

export function registerAssistBackgroundHandlers(): void {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        const selection = info.selectionText?.trim();
        if (!selection || !tab?.id) return;
        const menuId = String(info.menuItemId);

        void (async () => {
            if (menuId === ASSIST_MENU.search) {
                await runSearch(selection);
                return;
            }
            if (menuId === ASSIST_MENU.define) {
                await runDefine(selection);
                return;
            }
            if (menuId === ASSIST_MENU.saveClip) {
                await saveCompareClip(selection);
                return;
            }
            if (menuId === ASSIST_MENU.compare) {
                await runCompare(selection);
                return;
            }
            if (menuId === ASSIST_MENU.verify) {
                await runVerify(tab.id!, selection);
            }
        })();
    });

    chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
        if (!message || typeof message !== 'object' || !('type' in message)) return;
        const typed = message as AssistRuntimeMessage;

        if (typed.type === 'assist:search') {
            void runSearch(typed.text).then(() => sendResponse({ ok: true }));
            return true;
        }
        if (typed.type === 'assist:define') {
            void runDefine(typed.text).then(() => sendResponse({ ok: true }));
            return true;
        }
        if (typed.type === 'assist:saveClip') {
            void saveCompareClip(typed.text).then((clip) =>
                sendResponse({ ok: true, clip } satisfies { ok: true; clip: string })
            );
            return true;
        }
        if (typed.type === 'assist:compare') {
            void runCompare(typed.text).then(sendResponse);
            return true;
        }
        if (typed.type === 'assist:verify') {
            const tabId = sender.tab?.id;
            if (!tabId) {
                sendResponse({ ok: false, error: 'No active tab' });
                return true;
            }
            void runVerify(tabId, typed.text).then(sendResponse);
            return true;
        }
        if (typed.type === 'assist:getClip') {
            void loadCompareClip().then((clip) => {
                sendResponse({ type: 'assist:clipState', clip } satisfies AssistRuntimeMessage);
            });
            return true;
        }
        if (typed.type === 'assist:clearClip') {
            void clearCompareClip().then(() => sendResponse({ ok: true }));
            return true;
        }

        return undefined;
    });
}
