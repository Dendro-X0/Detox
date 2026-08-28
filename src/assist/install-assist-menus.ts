/// <reference types="chrome" />
import { AUTHENTICITY_CONTEXT_MENU_ID } from '../mods/analyzers/authenticity/constants';
import { ASSIST_MENU } from './types';

/** Unified selection menus — call instead of authenticity-only removeAll. */
export function installAssistContextMenus(): void {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: ASSIST_MENU.root,
            title: 'SignalLens',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: ASSIST_MENU.search,
            parentId: ASSIST_MENU.root,
            title: 'Search selection',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: ASSIST_MENU.define,
            parentId: ASSIST_MENU.root,
            title: 'Define (Wikipedia)',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: ASSIST_MENU.saveClip,
            parentId: ASSIST_MENU.root,
            title: 'Save as compare clip',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: ASSIST_MENU.compare,
            parentId: ASSIST_MENU.root,
            title: 'Compare with saved clip',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: ASSIST_MENU.verify,
            parentId: ASSIST_MENU.root,
            title: 'Verify (experimental)',
            contexts: ['selection'],
        });
        // Keep legacy id as alias so older docs/tests still resolve if referenced.
        void AUTHENTICITY_CONTEXT_MENU_ID;
    });
}
