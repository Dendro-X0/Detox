import { formatBlockReasonSummary } from '../filtering/format-block-reason';
import { getResolvedFilterAppearance } from '../settings/filter-appearance-store';
import { filterAppearanceStyleBlock } from './filter-appearance-css';
import { formatFilteredTitle } from './format-filtered-title';
import type { Verdict } from '../types/verdict';
import { runtimeTranslate } from '../../i18n/runtime-locale';

const FRAME_CLASS = 'sl-filter-frame';
const LABEL_CLASS = 'sl-filter-frame-label';
const REASON_CLASS = 'sl-filter-frame-reason';
const HINT_CLASS = 'sl-filter-frame-hint';
const STYLE_ID = 'sl-filter-affordance-styles';

/** @deprecated Use sl-filter-frame — kept for test cleanup compatibility */
export const FILTER_BADGE_CLASS = 'sl-filter-badge';

const frameByElement = new WeakMap<HTMLElement, HTMLDivElement>();
const trackedElements = new Set<HTMLElement>();

let layoutListenersInstalled = false;
let intersectionObserver: IntersectionObserver | null = null;
let syncRafId = 0;

function ensureStyles(): void {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.documentElement.appendChild(style);
    }

    const appearanceBlock = filterAppearanceStyleBlock(getResolvedFilterAppearance());
    style.textContent = `
        ${appearanceBlock}

        .${FRAME_CLASS} {
            all: initial;
            position: fixed;
            z-index: 2147483646;
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            border: var(--sl-filter-frame-border-width, 2px) solid var(--sl-filter-frame-border, rgba(74, 222, 128, 0.72));
            border-radius: 8px;
            background: var(--sl-filter-frame-fill, rgba(15, 23, 20, 0.14));
            box-shadow: inset 0 0 0 1px rgba(74, 222, 128, 0.18), 0 4px 18px rgba(0, 0, 0, 0.22);
            pointer-events: auto;
            cursor: pointer;
            overflow: visible;
            transition: opacity 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }

        .${FRAME_CLASS}:hover,
        .${FRAME_CLASS}:focus-within {
            border-color: var(--sl-filter-frame-border-hover, rgba(74, 222, 128, 0.95));
            background: var(--sl-filter-frame-fill-hover, rgba(15, 23, 20, 0.2));
        }

        .${FRAME_CLASS}[hidden] {
            display: none !important;
        }

        .${HINT_CLASS} {
            display: var(--sl-filter-hint-display, block);
        }

        .${LABEL_CLASS} {
            all: initial;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: var(--sl-filter-label-display, flex);
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            margin: 0;
            padding: 8px 14px;
            border: 1px solid rgba(74, 222, 128, 0.55);
            border-radius: 10px;
            background: rgba(15, 23, 20, 0.94);
            color: #4ade80;
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
            cursor: pointer;
            pointer-events: auto;
            max-width: calc(100% - 20px);
            text-align: center;
        }

        .${REASON_CLASS} {
            font: 600 12px/1.25 system-ui, -apple-system, "Segoe UI", sans-serif;
            letter-spacing: 0.01em;
        }

        .${HINT_CLASS} {
            font: 500 10px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
            opacity: 0.82;
            letter-spacing: 0.02em;
        }

        .${LABEL_CLASS}:hover,
        .${LABEL_CLASS}:focus-visible {
            border-color: #4ade80;
            outline: 2px solid rgba(74, 222, 128, 0.35);
            outline-offset: 1px;
        }
    `;
}

/** Re-apply CSS variables when appearance settings change (content script). */
export function refreshFilterAppearanceStyles(): void {
    if (!document.getElementById(STYLE_ID)) return;
    ensureStyles();
    for (const element of trackedElements) {
        const frame = frameByElement.get(element);
        if (!frame) continue;
        const hint = frame.querySelector<HTMLElement>(`.${HINT_CLASS}`);
        if (hint) {
            hint.style.display = getResolvedFilterAppearance().showRevealHint ? '' : 'none';
        }
    }
}

function ensureIntersectionObserver(): void {
    if (intersectionObserver) return;

    intersectionObserver = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const element = entry.target as HTMLElement;
                const frame = frameByElement.get(element);
                if (!frame) continue;

                if (!entry.isIntersecting) {
                    frame.hidden = true;
                    continue;
                }

                frame.hidden = false;
                positionFrame(element);
            }
        },
        { root: null, rootMargin: '0px', threshold: 0 }
    );
}

function ensureLayoutListeners(): void {
    if (layoutListenersInstalled) return;
    layoutListenersInstalled = true;

    const scheduleSync = (): void => {
        if (syncRafId !== 0) return;
        syncRafId = requestAnimationFrame(() => {
            syncRafId = 0;
            syncAllFrames();
        });
    };

    window.addEventListener('scroll', scheduleSync, { passive: true, capture: true });
    window.addEventListener('resize', scheduleSync, { passive: true });
}

function positionFrame(element: HTMLElement): void {
    const frame = frameByElement.get(element);
    if (!frame || frame.hidden) return;

    const rect = element.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    let top = rect.top;
    let left = rect.left;

    if (width <= 0) width = element.offsetWidth;
    if (height <= 0) height = element.offsetHeight;
    if (width <= 0 && element.style.width) width = parseFloat(element.style.width) || 0;
    if (height <= 0 && element.style.height) height = parseFloat(element.style.height) || 0;

    if (width <= 0 || height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
        frame.hidden = true;
        return;
    }

    frame.hidden = false;
    frame.style.top = `${top}px`;
    frame.style.left = `${left}px`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
}

function syncAllFrames(): void {
    for (const element of trackedElements) {
        if (!element.isConnected) {
            removeFilteredAffordance(element);
            continue;
        }
        positionFrame(element);
    }
}

function labelReason(verdict: Verdict): string {
    return formatBlockReasonSummary(verdict, runtimeTranslate);
}

function labelHint(): string {
    return runtimeTranslate('enforcement.clickToShow');
}

function createFrameOverlay(element: HTMLElement, verdict: Verdict): HTMLDivElement {
    const frame = document.createElement('div');
    frame.className = FRAME_CLASS;
    frame.setAttribute('role', 'presentation');

    const label = document.createElement('button');
    label.type = 'button';
    label.className = LABEL_CLASS;
    label.title = formatFilteredTitle(verdict);
    label.setAttribute('aria-label', label.title);

    const reason = document.createElement('span');
    reason.className = REASON_CLASS;
    reason.textContent = labelReason(verdict);

    const hint = document.createElement('span');
    hint.className = HINT_CLASS;
    hint.textContent = labelHint();

    label.append(reason, hint);
    frame.appendChild(label);

    const reveal = (event: Event): void => {
        event.preventDefault();
        event.stopPropagation();
        element.dispatchEvent(
            new MouseEvent('click', { bubbles: false, cancelable: true, view: window })
        );
    };

    frame.addEventListener('click', reveal);
    label.addEventListener('click', reveal);

    return frame;
}

export function attachFilteredAffordance(element: HTMLElement, verdict: Verdict): void {
    removeFilteredAffordance(element);
    ensureStyles();
    ensureLayoutListeners();
    ensureIntersectionObserver();

    const frame = createFrameOverlay(element, verdict);
    document.body.appendChild(frame);
    frameByElement.set(element, frame);
    trackedElements.add(element);
    intersectionObserver?.observe(element);
    positionFrame(element);
}

export function removeFilteredAffordance(element: HTMLElement): void {
    const frame = frameByElement.get(element);
    if (frame) {
        frame.remove();
    }
    frameByElement.delete(element);
    if (trackedElements.delete(element)) {
        intersectionObserver?.unobserve(element);
    }
}

export function refreshFilteredAffordanceLabels(): void {
    for (const element of trackedElements) {
        const frame = frameByElement.get(element);
        if (!frame) continue;
        const raw = element.getAttribute('data-sl-verdict');
        if (!raw) continue;
        try {
            const verdict = JSON.parse(raw) as Verdict;
            const reason = frame.querySelector(`.${REASON_CLASS}`);
            const label = frame.querySelector<HTMLButtonElement>(`.${LABEL_CLASS}`);
            if (reason) reason.textContent = labelReason(verdict);
            if (label) {
                label.title = formatFilteredTitle(verdict);
                label.setAttribute('aria-label', label.title);
            }
        } catch {
            // ignore malformed stored verdict
        }
    }
}
