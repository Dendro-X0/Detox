/// <reference types="chrome" />

const FLAG_CLASS = 'signallens-auth-flag';

function statusLabel(status: string): string {
    switch (status) {
        case 'unsupported':
            return 'Sources not found';
        case 'disputed':
            return 'Disputed — verify';
        case 'partially_supported':
            return 'Partially supported';
        default:
            return 'Worth verifying';
    }
}

function findBlockElement(blockId?: string): HTMLElement | null {
    if (blockId) {
        const byId = document.querySelector<HTMLElement>(`[data-detox-id="${blockId}"]`);
        if (byId) return byId;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.getRangeAt(0).commonAncestorContainer;
    const element = node instanceof HTMLElement ? node : node.parentElement;
    return element?.closest<HTMLElement>('article, [data-detox-id], p, div') ?? null;
}

export function showAdvisoryFlag(blockId: string | undefined, status: string): void {
    const target = findBlockElement(blockId);
    if (!target) return;

    const existing = target.querySelector<HTMLElement>(`.${FLAG_CLASS}`);
    if (existing) existing.remove();

    const badge = document.createElement('span');
    badge.className = FLAG_CLASS;
    badge.textContent = statusLabel(status);
    badge.title = 'SignalLens authenticity assist (advisory only). Click to dismiss.';
    badge.setAttribute('role', 'note');
    Object.assign(badge.style, {
        display: 'inline-block',
        marginLeft: '6px',
        padding: '2px 6px',
        fontSize: '11px',
        borderRadius: '4px',
        background: 'rgba(90, 120, 200, 0.15)',
        color: '#2a3d6b',
        cursor: 'pointer',
        verticalAlign: 'middle',
    });
    badge.addEventListener('click', (e) => {
        e.stopPropagation();
        badge.remove();
    });

    if (target.firstChild) {
        target.insertBefore(badge, target.firstChild);
    } else {
        target.appendChild(badge);
    }
}

export function installAuthenticityContentBridge(): void {
    chrome.runtime.onMessage.addListener((message: unknown) => {
        if (!message || typeof message !== 'object') return;
        const record = message as { type?: string; blockId?: string; status?: string };

        if (record.type === 'authenticity:showFlag' && typeof record.status === 'string') {
            showAdvisoryFlag(record.blockId, record.status);
            return;
        }

        if (record.type === 'authenticity:analyze') {
            const selectionText =
                (record as { selectionText?: string }).selectionText ??
                window.getSelection()?.toString()?.trim() ??
                '';
            if (!selectionText) return;

            void chrome.runtime.sendMessage({
                type: 'authenticity:analyze',
                scopeRequest: (record as { scopeRequest?: { kind: 'selection'; text: string } }).scopeRequest ?? {
                    kind: 'selection',
                    text: selectionText,
                },
                selectionText,
                pageTitle: document.title,
                url: location.href,
                hostname: location.hostname,
            });
        }
    });
}
