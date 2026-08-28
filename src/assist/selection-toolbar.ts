/// <reference types="chrome" />
import { runtimeTranslate } from '../i18n/runtime-locale';
import {
    loadAssistSettings,
    subscribeToAssistSettings,
} from './assist-settings-store';
import type { AssistSettings } from './types';

const HOST_ID = 'signallens-assist-toolbar';
const STYLE_ID = 'signallens-assist-toolbar-style';
const MIN_SELECTION_CHARS = 2;
const MAX_PREVIEW = 80;

let hideTimer: number | null = null;
let toolbarEnabled = true;

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOST_ID} {
        all: initial;
        position: fixed;
        z-index: 2147483645;
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-width: min(320px, calc(100vw - 24px));
        padding: 8px;
        border-radius: 10px;
        border: 1px solid rgba(40, 80, 60, 0.35);
        background: rgba(248, 252, 249, 0.97);
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
        font-family: "Segoe UI", system-ui, sans-serif;
        color: #1a2e24;
      }
      #${HOST_ID}[hidden] { display: none !important; }
      #${HOST_ID} .sl-assist-preview {
        all: unset;
        display: block;
        font-size: 11px;
        line-height: 1.35;
        color: #456;
        max-height: 2.7em;
        overflow: hidden;
      }
      #${HOST_ID} .sl-assist-actions {
        all: unset;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      #${HOST_ID} button {
        all: unset;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        padding: 5px 8px;
        border-radius: 6px;
        background: rgba(40, 120, 80, 0.12);
        color: #1a3d2c;
        border: 1px solid rgba(40, 120, 80, 0.28);
      }
      #${HOST_ID} button:hover {
        background: rgba(40, 120, 80, 0.2);
      }
      #${HOST_ID} .sl-assist-status {
        all: unset;
        display: block;
        font-size: 11px;
        color: #2a5;
      }
      #${HOST_ID} .sl-assist-error {
        color: #a33;
      }
    `;
    document.documentElement.appendChild(style);
}

function getHost(): HTMLDivElement {
    ensureStyles();
    let host = document.getElementById(HOST_ID) as HTMLDivElement | null;
    if (!host) {
        host = document.createElement('div');
        host.id = HOST_ID;
        host.hidden = true;
        host.setAttribute('role', 'toolbar');
        host.setAttribute('aria-label', 'SignalLens assist');
        document.documentElement.appendChild(host);
    }
    return host;
}

function currentSelectionText(): string {
    return window.getSelection()?.toString()?.trim() ?? '';
}

function selectionAnchorRect(): DOMRect | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return rect;
}

function setStatus(host: HTMLElement, message: string, isError = false): void {
    let status = host.querySelector<HTMLElement>('.sl-assist-status');
    if (!status) {
        status = document.createElement('span');
        status.className = 'sl-assist-status';
        host.appendChild(status);
    }
    status.textContent = message;
    status.classList.toggle('sl-assist-error', isError);
}

function sendAssist(type: 'assist:search' | 'assist:define' | 'assist:saveClip' | 'assist:compare' | 'assist:verify', text: string): void {
    const host = getHost();
    void chrome.runtime.sendMessage({ type, text }, (response: unknown) => {
        if (chrome.runtime.lastError) {
            setStatus(host, chrome.runtime.lastError.message ?? 'Failed', true);
            return;
        }
        const record = response as { ok?: boolean; error?: string } | undefined;
        if (record && record.ok === false && record.error) {
            setStatus(host, record.error, true);
            return;
        }
        if (type === 'assist:saveClip') {
            setStatus(host, runtimeTranslate('assist.toolbar.clipSaved'));
        } else if (type === 'assist:compare') {
            setStatus(host, runtimeTranslate('assist.toolbar.compareOpened'));
        }
    });
}

function renderToolbar(text: string, rect: DOMRect): void {
    const host = getHost();
    host.innerHTML = '';

    const preview = document.createElement('span');
    preview.className = 'sl-assist-preview';
    preview.textContent =
        text.length > MAX_PREVIEW ? `${text.slice(0, MAX_PREVIEW)}…` : text;

    const actions = document.createElement('div');
    actions.className = 'sl-assist-actions';

    const buttons: readonly { readonly labelKey: string; readonly type: Parameters<typeof sendAssist>[0] }[] = [
        { labelKey: 'assist.toolbar.search', type: 'assist:search' },
        { labelKey: 'assist.toolbar.define', type: 'assist:define' },
        { labelKey: 'assist.toolbar.saveClip', type: 'assist:saveClip' },
        { labelKey: 'assist.toolbar.compare', type: 'assist:compare' },
        { labelKey: 'assist.toolbar.verify', type: 'assist:verify' },
    ];

    for (const button of buttons) {
        const el = document.createElement('button');
        el.type = 'button';
        el.textContent = runtimeTranslate(button.labelKey);
        el.addEventListener('mousedown', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
        el.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            sendAssist(button.type, text);
        });
        actions.appendChild(el);
    }

    host.append(preview, actions);
    host.hidden = false;

    const top = Math.min(window.innerHeight - 8, rect.bottom + 8);
    const left = Math.min(window.innerWidth - 16, Math.max(8, rect.left));
    host.style.top = `${Math.max(8, top)}px`;
    host.style.left = `${left}px`;
}

function hideToolbarSoon(): void {
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
        const host = document.getElementById(HOST_ID);
        if (host) host.hidden = true;
    }, 250);
}

function refreshFromSelection(): void {
    if (!toolbarEnabled) {
        const host = document.getElementById(HOST_ID);
        if (host) host.hidden = true;
        return;
    }
    const text = currentSelectionText();
    const rect = selectionAnchorRect();
    if (!text || text.length < MIN_SELECTION_CHARS || !rect) {
        hideToolbarSoon();
        return;
    }
    if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
    }
    renderToolbar(text, rect);
}

function applySettings(settings: AssistSettings): void {
    toolbarEnabled = settings.selectionToolbarEnabled;
    if (!toolbarEnabled) {
        const host = document.getElementById(HOST_ID);
        if (host) host.hidden = true;
    }
}

export function installAssistSelectionToolbar(): void {
    void loadAssistSettings().then(applySettings);
    subscribeToAssistSettings(applySettings);

    document.addEventListener('mouseup', () => {
        window.setTimeout(refreshFromSelection, 0);
    });
    document.addEventListener('keyup', (event) => {
        if (event.key === 'Shift' || event.key.startsWith('Arrow')) {
            window.setTimeout(refreshFromSelection, 0);
        }
    });
    document.addEventListener('mousedown', (event) => {
        const host = document.getElementById(HOST_ID);
        if (host && event.target instanceof Node && host.contains(event.target)) return;
        hideToolbarSoon();
    });
    document.addEventListener('scroll', () => {
        const host = document.getElementById(HOST_ID);
        if (host && !host.hidden) refreshFromSelection();
    }, true);
}
