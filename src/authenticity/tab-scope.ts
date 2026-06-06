/// <reference types="chrome" />
import type { PageContext } from '../mods/analyzers/authenticity/page-context';
import type { ScopeRequest } from '../mods/analyzers/authenticity/scope-resolver';

export type SelectionSnapshot = {
    readonly text: string;
    readonly blockId?: string;
};

export async function queryActiveTabId(): Promise<number | null> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    return tabId ?? null;
}

export async function getSelectionFromTab(tabId: number): Promise<SelectionSnapshot> {
    try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'authenticity:getSelection' });
        const record = response as SelectionSnapshot | undefined;
        return { text: record?.text?.trim() ?? '', blockId: record?.blockId };
    } catch {
        return { text: '' };
    }
}

export async function getPageContextFromTab(tabId: number): Promise<PageContext | null> {
    try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'authenticity:getPageContext' });
        return (response as PageContext | undefined) ?? null;
    } catch {
        return null;
    }
}

export function buildScopeRequest(
    kind: ScopeRequest['kind'],
    selection: SelectionSnapshot,
    pageContext: PageContext | null
): ScopeRequest {
    if (kind === 'full_page') {
        return { kind: 'full_page', text: pageContext?.mainText ?? '' };
    }
    if (kind === 'thread') {
        return {
            kind: 'thread',
            text: selection.text || (pageContext?.mainText?.slice(0, 8_000) ?? ''),
            rootBlockId: selection.blockId,
        };
    }
    return {
        kind: 'selection',
        text: selection.text,
        blockId: selection.blockId,
    };
}
