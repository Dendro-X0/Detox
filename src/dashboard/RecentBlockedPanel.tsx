/// <reference types="chrome" />
import { useCallback, useEffect, useState } from 'react';
import type { BlockFeedback } from '../core/types/block';
import {
    loadRevealFeedbackStats,
    submitBlockFeedback,
    type RevealFeedbackStats,
} from '../core/feedback/reveal-feedback-store';
import { sessionGet, subscribeSessionChanges } from '../core/storage/extension-session';
import { useLocale } from '../i18n/LocaleContext';
import { BlockedItemRow, type BlockedItemLike } from './BlockReasonChips';

function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type RecentBlockedPanelProps = {
    readonly limit?: number;
    readonly compact?: boolean;
    readonly showFeedback?: boolean;
    readonly pageKey?: string;
    readonly onReveal?: (item: BlockedItemLike) => void;
    readonly heading?: string;
    /** Omit outer card wrapper (e.g. when embedded in popup page status). */
    readonly bare?: boolean;
};

function sortBlockedItems(
    items: readonly BlockedItemLike[],
    pageKey?: string
): readonly BlockedItemLike[] {
    const scoped = pageKey
        ? items.filter((item) => !item.pageKey || item.pageKey === pageKey)
        : items;

    return [...scoped].sort((a, b) => {
        if (Boolean(a.revealed) !== Boolean(b.revealed)) {
            return a.revealed ? 1 : -1;
        }
        return b.timestamp - a.timestamp;
    });
}

export default function RecentBlockedPanel({
    limit = 5,
    compact = false,
    showFeedback = true,
    pageKey,
    onReveal,
    heading,
    bare = false,
}: RecentBlockedPanelProps) {
    const { t } = useLocale();
    const [items, setItems] = useState<readonly BlockedItemLike[]>([]);
    const [stats, setStats] = useState<RevealFeedbackStats | null>(null);

    const refreshStats = useCallback(() => {
        void loadRevealFeedbackStats().then(setStats);
    }, []);

    useEffect(() => {
        void sessionGet<readonly BlockedItemLike[]>('blockedItems').then((stored) => {
            setItems(stored ?? []);
        });
        refreshStats();
        return subscribeSessionChanges((changes) => {
            if (changes.blockedItems) {
                setItems((changes.blockedItems.newValue as readonly BlockedItemLike[]) ?? []);
            }
        });
    }, [refreshStats]);

    const onFeedback = useCallback(
        (item: BlockedItemLike, feedback: BlockFeedback) => {
            void submitBlockFeedback(
                {
                    id: item.id,
                    detectorId: item.detectorId ?? 'unknown',
                    labelId: item.labelId,
                    score: item.score,
                    preview: item.preview,
                    hostname: item.hostname,
                },
                feedback
            ).then(() => {
                setItems((prev) =>
                    prev.map((entry) =>
                        entry.id === item.id ? { ...entry, feedback, revealed: true } : entry
                    )
                );
                refreshStats();
            });
        },
        [refreshStats]
    );

    const visible = sortBlockedItems(items, pageKey).slice(0, limit);
    const activeCount = visible.filter((item) => !item.revealed).length;
    const feedbackHandler = showFeedback ? onFeedback : undefined;

    const body = (
        <>
            <h3>{heading ?? t('settings.overview.recentBlockedHeading')}</h3>
            {activeCount > 0 ? (
                <p className="sl-form-hint sl-recent-blocked-summary">
                    {t('settings.overview.recentBlockedActive', { count: activeCount })}
                </p>
            ) : null}
            {stats && (stats.wrong > 0 || stats.ok > 0) ? (
                <p className="sl-form-hint sl-reveal-feedback-summary">
                    {t('settings.filtering.feedbackSummary', {
                        wrong: stats.wrong,
                        ok: stats.ok,
                    })}
                </p>
            ) : null}
            {visible.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {t('settings.overview.recentBlockedEmpty')}
                </p>
            ) : (
                <ul className="blocked-list sl-scroll-region">
                    {visible.map((item) => (
                        <BlockedItemRow
                            key={item.id}
                            item={item}
                            formatTime={formatTime}
                            onFeedback={feedbackHandler}
                            onReveal={onReveal}
                            compact={compact}
                        />
                    ))}
                </ul>
            )}
        </>
    );

    if (bare) {
        return (
            <div className={`sl-recent-blocked sl-recent-blocked--bare${compact ? ' sl-recent-blocked--compact' : ''}`}>
                {body}
            </div>
        );
    }

    return (
        <div className={`card policy-card sl-recent-blocked${compact ? ' sl-recent-blocked--compact' : ''}`}>
            {body}
        </div>
    );
}
