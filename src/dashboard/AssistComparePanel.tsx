/// <reference types="chrome" />
import { useCallback, useEffect, useState } from 'react';
import {
    ASSIST_COMPARE_REPORT_KEY,
    loadCompareReport,
} from '../assist/compare-report';
import { formatOverlapPercent } from '../assist/compare-overlap';
import type { AssistCompareReport } from '../assist/compare-overlap';
import { useLocale } from '../i18n/LocaleContext';

export default function AssistComparePanel() {
    const { t } = useLocale();
    const [report, setReport] = useState<AssistCompareReport | null>(null);

    const refresh = useCallback(() => {
        void loadCompareReport().then(setReport);
    }, []);

    useEffect(() => {
        refresh();
        const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
            if (area !== 'session' && area !== 'local') return;
            if (changes[ASSIST_COMPARE_REPORT_KEY]) refresh();
        };
        chrome.storage.onChanged.addListener(listener);
        const interval = window.setInterval(refresh, 800);
        return () => {
            chrome.storage.onChanged.removeListener(listener);
            window.clearInterval(interval);
        };
    }, [refresh]);

    const openVerifyPanel = (): void => {
        const url = chrome.runtime.getURL('sidepanel.html');
        window.location.href = url;
    };

    const openCombinedSearch = (): void => {
        if (!report?.combinedSearchUrl) return;
        void chrome.tabs.create({ url: report.combinedSearchUrl });
    };

    if (!report) {
        return (
            <div className="container" style={{ padding: '1rem', maxWidth: '100%' }}>
                <h2>{t('assist.compare.panel.heading')}</h2>
                <p className="muted">{t('assist.compare.panel.empty')}</p>
            </div>
        );
    }

    const overlapPercent = formatOverlapPercent(report.overlap.overlapScore);

    return (
        <div className="container" style={{ padding: '1rem', maxWidth: '100%' }}>
            <h2>{t('assist.compare.panel.heading')}</h2>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('assist.compare.panel.advisory')}
            </p>

            <div className="sl-compare-grid" style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                <CompareSideCard
                    title={t('assist.compare.panel.sideA')}
                    side={report.sideA}
                    t={t}
                />
                <CompareSideCard
                    title={t('assist.compare.panel.sideB')}
                    side={report.sideB}
                    t={t}
                />
            </div>

            <section className="sl-panel" style={{ marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>{t('assist.compare.panel.overlapHeading')}</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                    {t(report.overlap.noteKey, { percent: overlapPercent })}
                </p>
                {report.overlap.sharedTerms.length > 0 ? (
                    <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
                        <strong>{t('assist.compare.panel.sharedTerms')}</strong>{' '}
                        {report.overlap.sharedTerms.join(', ')}
                    </p>
                ) : null}
            </section>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <button type="button" className="preset-btn active" onClick={openCombinedSearch}>
                    {t('assist.compare.panel.openSearch')}
                </button>
                <button type="button" className="preset-btn" onClick={openVerifyPanel}>
                    {t('assist.compare.panel.openVerify')}
                </button>
            </div>
        </div>
    );
}

function CompareSideCard({
    title,
    side,
    t,
}: {
    readonly title: string;
    readonly side: AssistCompareReport['sideA'];
    readonly t: (key: string) => string;
}) {
    return (
        <article className="card policy-card sl-compare-side">
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: 0 }}>
                {side.label === 'clip'
                    ? t('assist.compare.panel.savedClip')
                    : t('assist.compare.panel.currentSelection')}
            </p>
            {side.title ? (
                <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{side.title}</p>
            ) : null}
            <blockquote className="sl-compare-quote" style={{ margin: '0.5rem 0', paddingLeft: '0.75rem', borderLeft: '3px solid rgba(40,120,80,0.35)', fontSize: '0.85rem' }}>{side.text}</blockquote>
            {side.excerpt ? (
                <p className="muted" style={{ fontSize: '0.82rem' }}>
                    {side.excerpt}
                </p>
            ) : null}
            {side.url ? (
                <a href={side.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem' }}>
                    {t('assist.compare.panel.openSource')}
                </a>
            ) : null}
        </article>
    );
}
