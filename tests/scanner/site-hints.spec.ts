import { describe, expect, it } from 'vitest';
import { REDDIT_HINT_PACK } from '../../src/core/scanner/hint-packs/reddit';
import { YOUTUBE_HINT_PACK } from '../../src/core/scanner/hint-packs/youtube';
import { resolveSiteHints } from '../../src/core/scanner/hint-registry';
import { scanUniversal } from '../../src/core/scanner/universal-scanner';
import { createScanCoordinator } from '../../src/core/scanner/scan-coordinator';
import { SCANNER_FIXTURES } from './fixture-expectations';
import {
    completenessRatio,
    elementText,
    fixtureChromeElements,
    loadScannerFixture,
    matchedFixtureUnits,
    textMatchesUnit,
} from './load-fixture';

const REDDIT_UNIT_IDS = ['post-body', 'thread-comment', 'slot-comment'] as const;

describe('S5 — site hints schema & registry', () => {
    it('bundled Reddit and YouTube packs expose ignore and boost selectors', () => {
        expect(REDDIT_HINT_PACK.hints.ignoreSelectors?.length).toBeGreaterThan(0);
        expect(REDDIT_HINT_PACK.hints.boostSelectors?.length).toBeGreaterThan(0);
        expect(YOUTUBE_HINT_PACK.hints.ignoreSelectors?.length).toBeGreaterThan(0);
        expect(YOUTUBE_HINT_PACK.hints.boostSelectors?.length).toBeGreaterThan(0);
    });

    it('resolveSiteHints returns null for unknown hosts (zero hints)', () => {
        expect(resolveSiteHints('example.com')).toBeNull();
    });

    it('resolveSiteHints merges packs when hostname and mod gate match', () => {
        const hints = resolveSiteHints('www.reddit.com', () => true);
        expect(hints?.ignoreSelectors).toContain('[data-testid="reddit-sidebar"]');
        expect(hints?.boostSelectors).toContain('.reddit-comment');
    });

    it('resolveSiteHints respects disabled hint mods', () => {
        const hints = resolveSiteHints('old.reddit.com', (modId) => modId !== 'adapter-reddit');
        expect(hints).toBeNull();
    });
});

describe('S5 — scanner with zero hints unchanged (I1–I3)', () => {
    for (const spec of SCANNER_FIXTURES) {
        it(`${spec.file} still meets I1 without hints`, () => {
            const document = loadScannerFixture(spec.file);
            const units = scanUniversal(document);
            const matched = matchedFixtureUnits(document, units, spec.expectedUnitIds);
            const ratio = completenessRatio(matched.length, spec.expectedUnitIds.length);
            expect(ratio).toBeGreaterThanOrEqual(spec.minCompleteness);
        });
    }
});

describe('S5 — Reddit hint precision', () => {
    it('ignoreSelectors drop sidebar chrome without losing thread comments', () => {
        const document = loadScannerFixture('reddit-hints.html');
        const withoutHints = scanUniversal(document);
        const withHints = scanUniversal(document, REDDIT_HINT_PACK.hints);

        const sidebar = document.querySelector<HTMLElement>('[data-fixture-chrome="sidebar-promo"]');
        expect(sidebar).not.toBeNull();
        const sidebarText = elementText(sidebar!);

        const leakedWithout = withoutHints.some((unit) => textMatchesUnit(unit.text, sidebarText));
        const leakedWith = withHints.some((unit) => textMatchesUnit(unit.text, sidebarText));

        expect(leakedWithout).toBe(true);
        expect(leakedWith).toBe(false);

        const completeness = completenessRatio(
            matchedFixtureUnits(document, withHints, REDDIT_UNIT_IDS).length,
            REDDIT_UNIT_IDS.length
        );
        expect(completeness).toBeGreaterThanOrEqual(0.9);
    });

    it('boostSelectors discover slot text without duplicate session ids (I2)', () => {
        const document = loadScannerFixture('reddit-hints.html');
        const withHints = scanUniversal(document, REDDIT_HINT_PACK.hints);
        const slot = document.querySelector<HTMLElement>('[data-fixture-unit="slot-comment"]');
        expect(slot).not.toBeNull();

        const foundSlot = withHints.some((unit) => textMatchesUnit(unit.text, elementText(slot!)));
        expect(foundSlot).toBe(true);

        const addedIds: string[] = [];
        const coordinator = createScanCoordinator(document, {
            onAdded: (units) => {
                for (const unit of units) {
                    addedIds.push(unit.id);
                }
            },
        }, {
            observeMutations: false,
            getHints: () => REDDIT_HINT_PACK.hints,
        });

        coordinator.start();
        coordinator.rescan();
        coordinator.rescan();
        expect(addedIds.length).toBe(coordinator.getSessionSeenIds().size);
        coordinator.stop();
    });

    it('does not scan chrome marked regions when hints mirror ignore selectors', () => {
        const document = loadScannerFixture('reddit-hints.html');
        const units = scanUniversal(document, REDDIT_HINT_PACK.hints);

        for (const element of fixtureChromeElements(document)) {
            const chromeText = elementText(element);
            const leaked = units.some((unit) => textMatchesUnit(unit.text, chromeText));
            expect(leaked).toBe(false);
        }
    });
});
