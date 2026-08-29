/// <reference types="chrome" />

const REPORT_TAB_STORAGE_KEY = 'assistCompareReportTabId';

type SidebarActionApi = {
    readonly setPanel: (details: { panel: string; tabId?: number }) => void;
    readonly open: () => void;
};

function getSidebarAction(): SidebarActionApi | null {
    const ext = chrome as typeof chrome & { sidebarAction?: SidebarActionApi };
    return ext.sidebarAction ?? null;
}

function isChromeSidePanelSupported(): boolean {
    return 'sidePanel' in chrome && typeof chrome.sidePanel?.open === 'function';
}

function comparePanelPath(): string {
    return 'sidepanel.html?view=compare';
}

async function openOrFocusReportTab(): Promise<void> {
    const stored = await chrome.storage.local.get(REPORT_TAB_STORAGE_KEY);
    const tabId = (stored as Record<string, number | undefined>)[REPORT_TAB_STORAGE_KEY];
    const url = chrome.runtime.getURL(comparePanelPath());

    if (typeof tabId === 'number') {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab.id !== undefined) {
                await chrome.tabs.update(tab.id, { active: true, url });
                if (tab.windowId !== undefined) {
                    await chrome.windows.update(tab.windowId, { focused: true });
                }
                return;
            }
        } catch {
            // Tab closed — create a new one below.
        }
    }

    const created = await chrome.tabs.create({ url });
    if (created.id !== undefined) {
        await chrome.storage.local.set({ [REPORT_TAB_STORAGE_KEY]: created.id });
    }
}

export async function openComparePanel(tabId: number): Promise<void> {
    const path = comparePanelPath();
    if (isChromeSidePanelSupported()) {
        await chrome.sidePanel.setOptions({ tabId, path, enabled: true });
        await chrome.sidePanel.open({ tabId });
        return;
    }

    const sidebar = getSidebarAction();
    if (sidebar) {
        sidebar.setPanel({ panel: chrome.runtime.getURL(path), tabId });
        sidebar.open();
        return;
    }

    await openOrFocusReportTab();
}
