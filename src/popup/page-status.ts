import { isHostnameAllowlisted } from '../core/rules/user-rules-store';
import type { PageScanStats } from '../core/storage/scan-stats-store';

export type PopupPageStatusKind =
    | 'unsupported'
    | 'focusOff'
    | 'whitelisted'
    | 'scanning'
    | 'filtered'
    | 'noMatches'
    | 'idle';

export function hostnameFromTabUrl(url: string | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
        return null;
    }
}

export function resolvePopupPageStatus(input: {
    readonly enabled: boolean;
    readonly hostname: string | null;
    readonly allowDomains: readonly string[];
    readonly pageStats: PageScanStats;
}): PopupPageStatusKind {
    if (!input.hostname) {
        return 'unsupported';
    }
    if (isHostnameAllowlisted(input.hostname, input.allowDomains)) {
        return 'whitelisted';
    }
    if (!input.enabled) {
        return 'focusOff';
    }
    if (input.pageStats.filtered > 0) {
        return 'filtered';
    }
    if (input.pageStats.discovered > input.pageStats.scanned) {
        return 'scanning';
    }
    if (input.pageStats.scanned > 0) {
        return 'noMatches';
    }
    return 'idle';
}
