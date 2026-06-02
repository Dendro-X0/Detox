import { DENSE_SITE_HOSTS } from './constants';
import type { AnalysisScope } from './types';

export type ScopeRequest = {
    readonly kind: AnalysisScope['kind'];
    readonly text?: string;
    readonly blockId?: string;
    readonly rootBlockId?: string;
};

export function detectSiteId(hostname: string): string {
    const host = hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('quora.com')) return 'quora';
    return 'generic';
}

export function isDenseSite(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return DENSE_SITE_HOSTS.has(host) || [...DENSE_SITE_HOSTS].some((dense) => host.endsWith(dense));
}

export function buildAnalysisScope(request: ScopeRequest, hostname: string, fallbackText: string): AnalysisScope {
    const text = request.text?.trim() || fallbackText.trim();
    if (request.kind === 'full_page') {
        return {
            kind: 'full_page',
            warnDenseSite: isDenseSite(hostname),
            text: text.slice(0, 12_000),
        };
    }
    if (request.kind === 'thread') {
        return {
            kind: 'thread',
            rootBlockId: request.rootBlockId ?? 'unknown',
            maxReplies: 5,
            text: text.slice(0, 8_000),
        };
    }
    return {
        kind: 'selection',
        text: text.slice(0, 4_000),
        blockId: request.blockId,
    };
}

export function scopeTextForCache(scope: AnalysisScope): string {
    return scope.text;
}
