import { describe, expect, it, vi } from 'vitest';
import { createScanCoordinator } from '../../src/core/scanner/scan-coordinator';
import { scanDiff } from '../../src/core/scanner/scan-diff';
import { scanUniversal } from '../../src/core/scanner/universal-scanner';
import { DOM_SWAP_STABLE_ID, SCANNER_FIXTURES } from './fixture-expectations';
import {
    completenessRatio,
    elementText,
    fixtureChromeElements,
    fixtureUnitElements,
    loadScannerFixture,
    matchedFixtureUnits,
    queryFixtureUnit,
    textMatchesUnit,
} from './load-fixture';

describe('S0 — scanner fixture catalog', () => {
    it('includes all five HTML fixtures on disk', () => {
        expect(SCANNER_FIXTURES).toHaveLength(5);
        for (const spec of SCANNER_FIXTURES) {
            const document = loadScannerFixture(spec.file);
            expect(fixtureUnitElements(document).length).toBeGreaterThan(0);
            expect(spec.expectedUnitIds.length).toBeGreaterThan(0);
        }
    });

    for (const spec of SCANNER_FIXTURES) {
        it(`${spec.file} marks expected prose units with data-fixture-unit`, () => {
            const document = loadScannerFixture(spec.file);
            for (const id of spec.expectedUnitIds) {
                const element = queryFixtureUnit(document, id);
                expect(element, `missing [data-fixture-unit="${id}"]`).not.toBeNull();
                expect(elementText(element!).length).toBeGreaterThan(12);
            }
        });
    }

    it('chrome-heavy.html marks chrome regions separately from prose', () => {
        const spec = SCANNER_FIXTURES.find((entry) => entry.file === 'chrome-heavy.html');
        expect(spec).toBeDefined();
        const document = loadScannerFixture('chrome-heavy.html');
        expect(fixtureChromeElements(document).length).toBe(spec!.chromeIds.length);
    });

    it('dom-swap.html exposes stable id for fingerprint tests', () => {
        const document = loadScannerFixture('dom-swap.html');
        const host = document.querySelector('[data-fixture-stable-id]');
        expect(host?.getAttribute('data-fixture-stable-id')).toBe(DOM_SWAP_STABLE_ID);
    });
});

describe('S1 — UniversalScanner.scan', () => {
    for (const spec of SCANNER_FIXTURES) {
        it(`${spec.file} meets completeness invariant I1 (≥${spec.minCompleteness * 100}%)`, () => {
            const document = loadScannerFixture(spec.file);
            const units = scanUniversal(document);

            const matched = matchedFixtureUnits(document, units, spec.expectedUnitIds);
            const ratio = completenessRatio(matched.length, spec.expectedUnitIds.length);

            expect(
                ratio,
                `matched ${matched.length}/${spec.expectedUnitIds.length} units — ids: ${matched.join(', ')}`
            ).toBeGreaterThanOrEqual(spec.minCompleteness);
        });
    }

    it('nested-comments.html emits one unit per comment, not per text node', () => {
        const document = loadScannerFixture('nested-comments.html');
        const units = scanUniversal(document);
        const commentIds = ['comment-1', 'comment-1-reply', 'comment-2'];

        for (const id of commentIds) {
            const element = queryFixtureUnit(document, id);
            expect(element).not.toBeNull();
            const matches = units.filter((unit) => textMatchesUnit(unit.text, elementText(element!)));
            expect(matches.length).toBe(1);
        }
    });

    it('chrome-heavy.html excludes navigation, widgets, and footer chrome', () => {
        const document = loadScannerFixture('chrome-heavy.html');
        const units = scanUniversal(document);
        const spec = SCANNER_FIXTURES.find((entry) => entry.file === 'chrome-heavy.html')!;

        for (const chromeId of spec.chromeIds) {
            const element = document.querySelector<HTMLElement>(`[data-fixture-chrome="${chromeId}"]`);
            expect(element).not.toBeNull();
            const chromeText = elementText(element!);
            const leaked = units.some((unit) => textMatchesUnit(unit.text, chromeText));
            expect(leaked, `chrome region "${chromeId}" should not appear in scan set`).toBe(false);
        }
    });

    it('shadow-dom.html discovers text inside shadow roots', () => {
        const document = loadScannerFixture('shadow-dom.html');
        const units = scanUniversal(document);
        const shadowEl = queryFixtureUnit(document, 'shadow-comment');
        expect(shadowEl).not.toBeNull();
        const found = units.some((unit) => textMatchesUnit(unit.text, elementText(shadowEl!)));
        expect(found).toBe(true);
    });
});

describe('S2 — scan diff & coordinator', () => {
    it('dom-swap.html keeps the same fingerprint after host replacement', () => {
        const document = loadScannerFixture('dom-swap.html');
        const before = scanUniversal(document);
        expect(before).toHaveLength(1);

        const host = document.querySelector('#comment-host')!;
        const paragraph = host.querySelector('p')!;
        const text = paragraph.textContent;

        const replacement = document.createElement('div');
        replacement.setAttribute('data-fixture-stable-id', DOM_SWAP_STABLE_ID);
        const newParagraph = document.createElement('p');
        newParagraph.setAttribute('data-fixture-unit', 'swap-comment');
        newParagraph.textContent = text;
        replacement.appendChild(newParagraph);
        host.replaceWith(replacement);

        const after = scanUniversal(document);
        expect(after).toHaveLength(1);
        expect(after[0]!.id).toBe(before[0]!.id);

        const diff = scanDiff(before, after);
        expect(diff.added).toHaveLength(0);
    });

    it('scanDiff reports added units on first expansion and skips removed bucket', () => {
        const document = loadScannerFixture('blog-article.html');
        const first = scanUniversal(document);
        expect(first.length).toBeGreaterThan(0);

        const diffFromEmpty = scanDiff([], first);
        expect(diffFromEmpty.added.length).toBe(first.length);
        expect(diffFromEmpty.updated).toHaveLength(0);

        const diffUnchanged = scanDiff(first, first);
        expect(diffUnchanged.added).toHaveLength(0);
        expect(diffUnchanged.updated).toHaveLength(0);
    });

    it('scanDiff marks element replacement as updated, not added', () => {
        const document = loadScannerFixture('dom-swap.html');
        const before = scanUniversal(document);

        const host = document.querySelector('#comment-host')!;
        const paragraph = host.querySelector('p')!;
        const text = paragraph.textContent;

        const replacement = document.createElement('div');
        const newParagraph = document.createElement('p');
        newParagraph.textContent = text;
        replacement.appendChild(newParagraph);
        host.replaceWith(replacement);

        const after = scanUniversal(document);
        const diff = scanDiff(before, after);

        expect(diff.added).toHaveLength(0);
        expect(diff.updated).toHaveLength(1);
        expect(diff.updated[0]!.id).toBe(before[0]!.id);
    });

    it('coordinator classifies each fingerprint at most once per session (I2)', async () => {
        const document = loadScannerFixture('dom-swap.html');
        const addedIds: string[] = [];

        const coordinator = createScanCoordinator(document, {
            onAdded: (units) => {
                for (const unit of units) {
                    addedIds.push(unit.id);
                }
            },
        }, { observeMutations: false, debounceMs: 20 });

        coordinator.start();
        expect(addedIds).toHaveLength(1);

        const host = document.querySelector('#comment-host')!;
        const paragraph = host.querySelector('p')!;
        const text = paragraph.textContent;

        const replacement = document.createElement('div');
        const newParagraph = document.createElement('p');
        newParagraph.textContent = text;
        replacement.appendChild(newParagraph);
        host.replaceWith(replacement);

        coordinator.rescan();
        expect(addedIds).toHaveLength(1);
        expect(coordinator.getSessionSeenIds().size).toBe(1);

        coordinator.stop();
    });

    it('coordinator debounces mutation-driven rescans', async () => {
        vi.useFakeTimers();

        const document = loadScannerFixture('dom-swap.html');
        let scanGenerations = 0;

        const coordinator = createScanCoordinator(document, {
            onAdded: () => {
                scanGenerations += 1;
            },
        }, { debounceMs: 50 });

        coordinator.start();
        expect(scanGenerations).toBe(1);

        const main = document.querySelector('main')!;
        main.appendChild(document.createElement('p')).textContent =
            'Extra paragraph appended during mutation burst should not trigger duplicate first-scan ids.';

        await vi.advanceTimersByTimeAsync(50);
        await vi.advanceTimersByTimeAsync(20);

        expect(scanGenerations).toBeGreaterThan(1);

        coordinator.stop();
        vi.useRealTimers();
    });
});
