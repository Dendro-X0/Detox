import {
    completenessRatio,
    elementText,
    matchedFixtureUnits,
    queryFixtureUnit,
} from './load-fixture';
import type { ContentUnit } from '../../src/core/scanner/content-unit';
import { loadAcceptanceFixture } from './load-acceptance-fixture';

export function ratioWithinBand(actual: number, expected: number, tolerance: number): boolean {
    if (expected <= 0) return actual === 0;
    const ratio = actual / expected;
    return ratio >= 1 - tolerance && ratio <= 1 + tolerance;
}

export function readFixtureUnitIds(document: Document): string[] {
    return [...document.querySelectorAll('[data-fixture-unit]')]
        .map((element) => element.getAttribute('data-fixture-unit'))
        .filter((id): id is string => Boolean(id));
}

/** Loads the recorded Reddit thread snapshot from disk (CI). */
export function loadRedditThreadDocument(): {
    readonly document: Document;
    readonly expectedUnitIds: readonly string[];
} {
    const document = loadAcceptanceFixture('reddit-thread.html');
    return { document, expectedUnitIds: readFixtureUnitIds(document) };
}

export function measureCompleteness(
    document: Document,
    units: readonly ContentUnit[],
    expectedUnitIds: readonly string[]
): number {
    const matched = matchedFixtureUnits(document, units, expectedUnitIds);
    return completenessRatio(matched.length, expectedUnitIds.length);
}

export function countMatchedUnits(
    document: Document,
    units: readonly ContentUnit[],
    expectedUnitIds: readonly string[]
): number {
    return matchedFixtureUnits(document, units, expectedUnitIds).length;
}

export function fixtureUnitCount(document: Document): number {
    return document.querySelectorAll('[data-fixture-unit]').length;
}

export function collectFixtureTexts(document: Document, ids: readonly string[]): string[] {
    return ids.map((id) => {
        const element = queryFixtureUnit(document, id);
        return element ? elementText(element) : '';
    });
}
