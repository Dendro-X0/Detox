import type { Verdict } from '../types/verdict';
import { runtimeTranslate } from '../../i18n/runtime-locale';

export function formatFilteredTitle(verdict: Verdict): string {
    return runtimeTranslate('enforcement.filteredTitle', {
        labelId: verdict.labelId,
        percent: (verdict.score * 100).toFixed(1),
    });
}
