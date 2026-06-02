/// <reference types="chrome" />

const REPORT_TAB_STORAGE_KEY = 'authenticityReportTabId';

type SidebarActionApi = {
    readonly setPanel: (details: { panel: string; tabId?: number }) => void;
    readonly open: () => void;
    readonly close?: () => void;
};

function getSidebarAction(): SidebarActionApi | null {
    const ext = chrome as typeof chrome & { sidebarAction?: SidebarActionApi };
    return ext.sidebarAction ?? null;
}

function isChromeSidePanelSupported(): boolean {
    return 'sidePanel' in chrome && typeof chrome.sidePanel?.open === 'function';
}

async function openFirefoxSidebar(tabId: number): Promise<void> {
    const sidebar = getSidebarAction();
    const panelUrl = chrome.runtime.getURL('sidepanel.html');
    if (sidebar) {
        sidebar.setPanel({ panel: panelUrl, tabId });
        sidebar.open();
        return;
    }
    await openOrFocusReportTab();
}

/** Reuse one report tab per profile when sidebar API is unavailable. */
async function openOrFocusReportTab(): Promise<void> {
    const stored = await chrome.storage.local.get(REPORT_TAB_STORAGE_KEY);
    const tabId = (stored as Record<string, number | undefined>)[REPORT_TAB_STORAGE_KEY];
    if (typeof tabId === 'number') {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab.id !== undefined) {
                await chrome.tabs.update(tab.id, { active: true });
                if (tab.windowId !== undefined) {
                    await chrome.windows.update(tab.windowId, { focused: true });
                }
                return;
            }
        } catch {
            // Tab closed — create a new one below.
        }
    }

    const created = await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
    if (created.id !== undefined) {
        await chrome.storage.local.set({ [REPORT_TAB_STORAGE_KEY]: created.id });
    }
}

/**
 * Opens the authenticity report UI: Chrome side panel, Firefox sidebar, or fallback tab.
 */
export async function openAuthenticityPanel(tabId: number): Promise<void> {
    if (isChromeSidePanelSupported()) {
        await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
        await chrome.sidePanel.open({ tabId });
        return;
    }

    if (getSidebarAction()) {
        await openFirefoxSidebar(tabId);
        return;
    }

    await openOrFocusReportTab();
}

export function isAuthenticityPanelSidebar(): boolean {
    return isChromeSidePanelSupported() || getSidebarAction() !== null;
}
