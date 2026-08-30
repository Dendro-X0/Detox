/// <reference types="chrome" />
import { useCallback, useEffect, useState } from 'react';
import {
    ASSIST_PAGE_UNDERSTAND_KEY,
    loadPageUnderstandReport,
} from '../assist/page-understand-store';
import type { AssistPageUnderstandReport } from '../assist/page-outline';
import { useLocale } from '../i18n/LocaleContext';

function claimTypeLabel(type: string, t: (key: string) => string): string {
    const key = `assist.understand.claimTypes.${type}`;
    const translated = t(key);
    return translated !== key ? translated : t('assist.understand.claimTypes.unknown');
}

export default function AssistUnderstandPanel() {
    const { t } = useLocale();
    const [report, setReport] = useState<AssistPageUnderstandReport | null>(null);

    const refresh = useCallback(() => {
        void loadPageUnderstandReport().then(setReport);
    }, []);

    useEffect(() => {
        refresh();
        const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
            if (area !== 'session' && area !== 'local') return;
            if (changes[ASSIST_PAGE_UNDERSTAND_KEY]) refresh();
        };
        chrome.storage.onChanged.addListener(listener);
        const interval = window.setInterval(refresh, 800);
        return () => {
            chrome.storage.onChanged.removeListener(listener);
            window.clearInterval(interval);
        };
    }, [refresh]);

    if (!report) {
        return (
            <div className="container" style={{ padding: '1rem', maxWidth: '100%' }}>
                <h2>{t('assist.understand.panel.heading')}</h2>
                <p className="muted">{t('assist.understand.panel.empty')}</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '1rem', maxWidth: '100%' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>{t('assist.understand.panel.heading')}</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
                {t('assist.understand.panel.advisory')}
            </p>
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{report.title || report.url}</p>
            <p className="muted" style={{ fontSize: '0.75rem', marginTop: 0 }}>
                {t('assist.understand.panel.meta', {
                    chars: report.charCount,
                    headings: report.outline.length,
                    claims: report.keyClaims.length,
                })}
            </p>

            {report.isDenseSite ? (
                <p className="sl-wizard-callout" style={{ fontSize: '0.8rem' }}>
                    {t('assist.understand.panel.denseWarning')}
                </p>
            ) : null}

            <section className="card policy-card" style={{ marginTop: '0.75rem' }}>
                <h3 style={{ marginTop: 0 }}>{t('assist.understand.panel.outlineHeading')}</h3>
                {report.outline.length === 0 ? (
                    <p className="muted" style={{ marginBottom: 0 }}>
                        {t('assist.understand.panel.noOutline')}
                    </p>
                ) : (
                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                        {report.outline.map((item, index) => (
                            <li
                                key={`${item.level}-${index}-${item.text.slice(0, 24)}`}
                                style={{
                                    marginBottom: '0.35rem',
                                    paddingLeft: `${(item.level - 1) * 0.75}rem`,
                                    fontSize: item.level <= 2 ? '0.9rem' : '0.82rem',
                                    fontWeight: item.level <= 2 ? 600 : 400,
                                }}
                            >
                                {item.text}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="card policy-card" style={{ marginTop: '0.75rem' }}>
                <h3 style={{ marginTop: 0 }}>{t('assist.understand.panel.claimsHeading')}</h3>
                {report.keyClaims.length === 0 ? (
                    <p className="muted" style={{ marginBottom: 0 }}>
                        {t('assist.understand.panel.noClaims')}
                    </p>
                ) : (
                    <ol style={{ margin: 0, paddingLeft: '1.1rem' }}>
                        {report.keyClaims.map((claim) => (
                            <li key={claim.id} style={{ marginBottom: '0.65rem' }}>
                                <span
                                    className="muted"
                                    style={{
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                    }}
                                >
                                    {claimTypeLabel(claim.type, t)}
                                </span>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>{claim.text}</p>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {report.limitations.length > 0 ? (
                <ul className="muted" style={{ fontSize: '0.78rem', marginTop: '0.75rem' }}>
                    {report.limitations.map((key) => (
                        <li key={key}>{t(key)}</li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
