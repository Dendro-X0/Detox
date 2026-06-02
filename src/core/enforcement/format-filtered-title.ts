import type { Verdict } from '../types/verdict';

export function formatFilteredTitle(verdict: Verdict): string {
    return `Filtered content (${verdict.labelId}: ${(verdict.score * 100).toFixed(1)}%) — Click to reveal`;
}
