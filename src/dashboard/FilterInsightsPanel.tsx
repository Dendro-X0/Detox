import { useCallback, useEffect, useState } from 'react';
import {
    loadRevealFeedbackStats,
    type RevealFeedbackStats,
} from '../core/feedback/reveal-feedback-store';
import { useLocale } from '../i18n/LocaleContext';
import { detectorLabel } from './runtime-labels';
import type { SettingsTabId } from './settings-tabs';

type FilterInsightsPanelProps = {
    readonly onNavigate?: (tab: SettingsTabId) => void;
};

export default function FilterInsightsPanel({ onNavigate }: FilterInsightsPanelProps) {
    const { t } = useLocale();
    const [stats, setStats] = useState<RevealFeedbackStats | null>(null);

    const refresh = useCallback(() => {
        void loadRevealFeedbackStats().then(setStats);
    }, []);

    useEffect(() => {
        refresh();
        const onChanged = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ): void => {
            if (area === 'local' && changes.revealFeedbackLog) {
                refresh();
            }
        };
        chrome.storage.onChanged.addListener(onChanged);
        return () => chrome.storage.onChanged.removeListener(onChanged);
    }, [refresh]);

    if (!stats || (stats.wrong === 0 && stats.ok === 0)) {
        return (
            <div className="card policy-card sl-filter-insights">
                <h3>{t('settings.overview.insightsHeading')}</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {t('settings.overview.insightsEmpty')}
                </p>
            </div>
        );
    }

    const detectorRows = Object.entries(stats.byDetector)
        .sort((a, b) => b[1].wrong - a[1].wrong)
        .slice(0, 4);

    return (
        <div className="card policy-card sl-filter-insights">
            <h3>{t('settings.overview.insightsHeading')}</h3>
            <p className="sl-form-hint">
                {t('settings.filtering.feedbackSummary', { wrong: stats.wrong, ok: stats.ok })}
            </p>
            {detectorRows.length > 0 ? (
                <ul className="sl-insights-detector-list">
                    {detectorRows.map(([detectorId, bucket]) => (
                        <li key={detectorId}>
                            <span className="sl-insights-detector-name">
                                {detectorLabel(detectorId, t)}
                            </span>
                            <span className="muted">
                                {t('settings.overview.insightsDetectorRow', {
                                    wrong: bucket.wrong,
                                    ok: bucket.ok,
                                })}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}
            {onNavigate ? (
                <button
                    type="button"
                    className="sl-btn-text"
                    onClick={() => onNavigate('filtering')}
                >
                    {t('settings.overview.insightsTuneLink')}
                </button>
            ) : null}
        </div>
    );
}
