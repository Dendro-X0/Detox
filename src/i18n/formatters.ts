import type { ScanDiagnosticsSnapshot } from '../core/scanner/scan-diagnostics';

export type TranslateFn = (key: string, values?: Readonly<Record<string, string | number>>) => string;

export function formatScanStatusLabelLocalized(
    status: ScanDiagnosticsSnapshot['status'],
    t: TranslateFn
): string {
    return t(`scan.status.${status}`);
}

export function formatRelativeTimeLocalized(
    timestampMs: number | null,
    nowMs: number,
    t: TranslateFn
): string {
    if (timestampMs === null) return t('scan.relative.never');
    const deltaSec = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
    if (deltaSec < 5) return t('scan.relative.justNow');
    if (deltaSec < 60) return t('scan.relative.secondsAgo', { seconds: deltaSec });
    const minutes = Math.floor(deltaSec / 60);
    if (minutes < 60) return t('scan.relative.minutesAgo', { minutes });
    return t('scan.relative.hoursAgo', { hours: Math.floor(minutes / 60) });
}
