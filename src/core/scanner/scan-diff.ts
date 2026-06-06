import type { ContentUnit } from './content-unit';

export type ScanDiffResult = {
    readonly added: readonly ContentUnit[];
    readonly updated: readonly ContentUnit[];
};

function indexById(units: readonly ContentUnit[]): Map<string, ContentUnit> {
    return new Map(units.map((unit) => [unit.id, unit]));
}

/**
 * Compare two scan snapshots. Virtualized DOM may drop nodes — no `removed` bucket.
 */
export function scanDiff(
    prev: readonly ContentUnit[],
    next: readonly ContentUnit[]
): ScanDiffResult {
    const prevById = indexById(prev);
    const added: ContentUnit[] = [];
    const updated: ContentUnit[] = [];

    for (const unit of next) {
        const existing = prevById.get(unit.id);
        if (!existing) {
            added.push(unit);
            continue;
        }
        if (existing.element !== unit.element || existing.text !== unit.text) {
            updated.push(unit);
        }
    }

    return { added, updated };
}
