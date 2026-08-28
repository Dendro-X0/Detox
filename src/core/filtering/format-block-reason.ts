import type { Verdict } from '../types/verdict';

export function blockReasonLabelKey(labelId: string | undefined): string {
    if (!labelId || labelId === 'noise') return 'filterReasons.labels.noise';
    return `filterReasons.labels.${labelId}`;
}

export function formatBlockReasonLabel(
    labelId: string | undefined,
    translate: (key: string) => string
): string {
    const key = blockReasonLabelKey(labelId);
    const translated = translate(key);
    return translated !== key ? translated : (labelId ?? translate('filterReasons.labels.noise'));
}

export function formatBlockReasonSummary(
    verdict: Pick<Verdict, 'labelId' | 'score' | 'secondaryReasons'>,
    translate: (key: string, params?: Record<string, string | number>) => string
): string {
    const label = formatBlockReasonLabel(verdict.labelId, translate);
    const primary = `${label} · ${Math.round(verdict.score * 100)}%`;
    const secondary = verdict.secondaryReasons?.[0];
    if (!secondary) return primary;

    const alsoLabel = formatBlockReasonLabel(secondary.labelId, translate);
    return translate('filterReasons.withAlso', {
        primary,
        also: alsoLabel,
    });
}
