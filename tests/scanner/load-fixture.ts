import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const FIXTURES_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../fixtures/scanner'
);

export function loadScannerFixture(filename: string): Document {
    const filePath = path.join(FIXTURES_DIR, filename);
    const html = fs.readFileSync(filePath, 'utf-8');
    const window = new Window();
    window.document.write(html);
    hydrateFixtureShadowRoots(window.document);
    return window.document;
}

/** happy-dom does not run inline custom-element bootstraps; hydrate test shadows here. */
export function hydrateFixtureShadowRoots(document: Document): void {
    for (const host of document.querySelectorAll('forum-comment')) {
        if (host.shadowRoot) continue;
        const root = host.attachShadow({ mode: 'open' });
        const slot = document.createElement('div');
        slot.setAttribute('data-fixture-unit', 'shadow-comment');
        slot.textContent =
            'Comment body rendered inside a web component shadow tree must still be ' +
            'reachable when the walker pierces shadow roots during universal scanning.';
        root.appendChild(slot);
    }
}

export function queryFixtureUnit(document: Document, id: string): HTMLElement | null {
    const direct = document.querySelector<HTMLElement>(`[data-fixture-unit="${id}"]`);
    if (direct) return direct;

    for (const element of document.querySelectorAll('*')) {
        const root = element.shadowRoot;
        if (!root) continue;
        const inner = root.querySelector<HTMLElement>(`[data-fixture-unit="${id}"]`);
        if (inner) return inner;
    }
    return null;
}

export function fixtureUnitElements(document: Document): HTMLElement[] {
    const units: HTMLElement[] = [...document.querySelectorAll<HTMLElement>('[data-fixture-unit]')];
    for (const element of document.querySelectorAll('*')) {
        const root = element.shadowRoot;
        if (!root) continue;
        units.push(...root.querySelectorAll<HTMLElement>('[data-fixture-unit]'));
    }
    return units;
}

export function fixtureChromeElements(document: Document): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[data-fixture-chrome]')];
}

export function elementText(element: HTMLElement): string {
    return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

export function textMatchesUnit(scannedText: string, expectedText: string): boolean {
    const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();
    const scanned = normalize(scannedText);
    const expected = normalize(expectedText);
    if (scanned === expected) return true;
    const prefixLength = Math.min(48, expected.length);
    return scanned.includes(expected.slice(0, prefixLength));
}

export function matchedFixtureUnits(
    document: Document,
    units: readonly { readonly text: string }[],
    expectedUnitIds: readonly string[]
): readonly string[] {
    return expectedUnitIds.filter((id) => {
        const element = queryFixtureUnit(document, id);
        if (!element) return false;
        const expectedText = elementText(element);
        return units.some((unit) => textMatchesUnit(unit.text, expectedText));
    });
}

export function completenessRatio(matched: number, expected: number): number {
    if (expected === 0) return 1;
    return matched / expected;
}

export const FIXTURE_DIR = FIXTURES_DIR;
