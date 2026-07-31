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
    verdict: Pick<Verdict, 'labelId' | 'score'>,
    translate: (key: string) => string
): string {
    const label = formatBlockReasonLabel(verdict.labelId, translate);
    return `${label} · ${Math.round(verdict.score * 100)}%`;
}
