import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createScanCoordinator } from '../../src/core/scanner/scan-coordinator';
import { scanUniversal } from '../../src/core/scanner/universal-scanner';
import { ACCEPTANCE_SCENARIOS } from './acceptance-expectations';
import {
    countMatchedUnits,
    loadRedditThreadDocument,
    measureCompleteness,
    ratioWithinBand,
} from './acceptance-helpers';
import { loadAcceptanceFixture, ACCEPTANCE_FIXTURE_DIR } from './load-acceptance-fixture';
import { loadScannerFixture } from './load-fixture';

const STATIC_UNIT_IDS = [
    'lead',
    'section-1',
    'section-2',
    'section-3',
    'section-4',
    'section-5',
    'section-6',
    'section-7',
    'conclusion',
] as const;

const INITIAL_FEED_IDS = ['feed-01', 'feed-02', 'feed-03', 'feed-04'] as const;
const LAZY_FEED_IDS = ['feed-05', 'feed-06', 'feed-07', 'feed-08'] as const;
const ALL_FEED_IDS = [...INITIAL_FEED_IDS, ...LAZY_FEED_IDS] as const;

describe('S4 — acceptance catalog', () => {
    it('lists recorded snapshot files on disk', () => {
        const files = [
            'static-article.html',
            'reddit-thread.html',
            'infinite-scroll.html',
            'spa-route-a.html',
            'spa-route-b.html',
            'spa-pushstate.html',
        ];
        for (const file of files) {
            expect(fs.existsSync(path.join(ACCEPTANCE_FIXTURE_DIR, file))).toBe(true);
        }
        expect(ACCEPTANCE_SCENARIOS.length).toBe(5);
        expect(fs.existsSync(path.join(ACCEPTANCE_FIXTURE_DIR, 'spa-pushstate.html'))).toBe(true);
    });
});

describe('S4 — static article', () => {
    const spec = ACCEPTANCE_SCENARIOS.find((entry) => entry.id === 'static-article')!;

    it('discovers ≥90% of prose blocks (I1)', () => {
        const document = loadAcceptanceFixture('static-article.html');
        const units = scanUniversal(document);
        const completeness = measureCompleteness(document, units, STATIC_UNIT_IDS);

        expect(completeness).toBeGreaterThanOrEqual(spec.minCompleteness);
    });

    it('classifies each fingerprint at most once per coordinator session (I2)', () => {
        const document = loadAcceptanceFixture('static-article.html');
        const addedCalls: string[] = [];

        const coordinator = createScanCoordinator(document, {
            onAdded: (units) => {
                for (const unit of units) {
                    addedCalls.push(unit.id);
                }
            },
        }, { observeMutations: false });

        coordinator.start();
        const afterFirst = coordinator.getSessionSeenIds().size;
        expect(afterFirst).toBeGreaterThan(0);

        coordinator.rescan();
        coordinator.rescan();

        expect(addedCalls.length).toBe(afterFirst);
        expect(coordinator.getSessionSeenIds().size).toBe(afterFirst);
        coordinator.stop();
    });
});

describe('S4 — reddit thread snapshot', () => {
    const spec = ACCEPTANCE_SCENARIOS.find((entry) => entry.id === 'reddit-thread')!;

    it('scan count stays within ±15% of loaded comments and does not run away (I3)', () => {
        const { document, expectedUnitIds } = loadRedditThreadDocument();
        const units = scanUniversal(document);
        const matched = countMatchedUnits(document, units, expectedUnitIds);
        const uniqueIds = new Set(units.map((unit) => unit.id));

        expect(ratioWithinBand(matched, expectedUnitIds.length, spec.scanTolerance)).toBe(true);
        expect(units.length).toBeLessThanOrEqual(expectedUnitIds.length * spec.maxScanMultiplier);
        expect(uniqueIds.size).toBe(units.length);
    });
});

describe('S4 — infinite scroll', () => {
    const spec = ACCEPTANCE_SCENARIOS.find((entry) => entry.id === 'infinite-scroll')!;

    it('grows with newly appended feed items then plateaus after idle', () => {
        const document = loadAcceptanceFixture('infinite-scroll.html');
        const addedGenerations: number[] = [];

        const coordinator = createScanCoordinator(document, {
            onAdded: (units) => {
                addedGenerations.push(units.length);
            },
        }, { observeMutations: false, debounceMs: 10 });

        coordinator.start();
        const initialMatched = countMatchedUnits(
            document,
            scanUniversal(document),
            INITIAL_FEED_IDS
        );
        expect(initialMatched).toBe(INITIAL_FEED_IDS.length);

        const feed = document.querySelector('#feed')!;
        const template = document.querySelector('#lazy-batch') as HTMLTemplateElement;
        feed.append(...template.content.childNodes);

        coordinator.rescan();
        const afterAppend = countMatchedUnits(document, scanUniversal(document), ALL_FEED_IDS);
        expect(afterAppend).toBe(ALL_FEED_IDS.length);
        expect(ratioWithinBand(afterAppend, ALL_FEED_IDS.length, spec.scanTolerance)).toBe(true);

        const seenAfterAppend = coordinator.getSessionSeenIds().size;
        coordinator.rescan();
        coordinator.rescan();
        expect(coordinator.getSessionSeenIds().size).toBe(seenAfterAppend);
        expect(addedGenerations.reduce((sum, count) => sum + count, 0)).toBe(seenAfterAppend);

        coordinator.stop();
    });
});

describe('S4 — SPA navigation (offline fingerprints)', () => {
    it('does not reuse fingerprints across route A and route B snapshots', () => {
        const routeA = loadAcceptanceFixture('spa-route-a.html');
        const routeB = loadAcceptanceFixture('spa-route-b.html');

        const unitsA = scanUniversal(routeA);
        const unitsB = scanUniversal(routeB);

        const idsA = new Set(unitsA.map((unit) => unit.id));
        const overlap = unitsB.filter((unit) => idsA.has(unit.id));

        expect(overlap).toHaveLength(0);
    });
});

describe('S4 — shadow DOM', () => {
    const spec = ACCEPTANCE_SCENARIOS.find((entry) => entry.id === 'shadow-dom')!;

    it('discovers prose inside shadow roots', () => {
        const document = loadScannerFixture('shadow-dom.html');
        const units = scanUniversal(document);
        const completeness = measureCompleteness(document, units, ['light-dom', 'shadow-comment']);

        expect(completeness).toBeGreaterThanOrEqual(spec.minCompleteness);
    });
});
