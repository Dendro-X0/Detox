/// <reference types="chrome" />
import { useCallback, useEffect, useState } from 'react';
import type { AuthenticityJobState, AuthenticityReport } from '../mods/analyzers/authenticity/types';
import type { AuthenticitySettings } from '../mods/analyzers/authenticity/settings';
import {
    AUTHENTICITY_JOB_STORAGE_KEY,
    AUTHENTICITY_REPORT_STORAGE_KEY,
} from '../mods/analyzers/authenticity/constants';
import { sessionGet } from '../core/storage/extension-session';
import { loadAuthenticitySettings } from '../mods/analyzers/authenticity/settings-store';
import { isAuthenticityPanelSidebar } from '../authenticity/open-panel';
import { useLocale } from '../i18n/LocaleContext';
import { localizeCompoundMessage, localizeMessage } from '../i18n/localize';
import type { ScopeRequest } from '../mods/analyzers/authenticity/scope-resolver';
import {
    buildScopeRequest,
    getPageContextFromTab,
    getSelectionFromTab,
    queryActiveTabId,
} from '../authenticity/tab-scope';

type ScopeChoice = ScopeRequest['kind'];

function epistemicLabel(status: string, t: (key: string) => string): string {
    const key = `sidepanel.epistemic.${status}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return t('sidepanel.epistemic.default');
}

export default function AuthenticitySidePanel() {
    const { t } = useLocale();
    const [job, setJob] = useState<AuthenticityJobState | null>(null);
    const [report, setReport] = useState<AuthenticityReport | null>(null);
    const [settings, setSettings] = useState<AuthenticitySettings | null>(null);
    const [scopeChoice, setScopeChoice] = useState<ScopeChoice>('selection');
    const [selectionPreview, setSelectionPreview] = useState('');
    const [denseSiteWarning, setDenseSiteWarning] = useState(false);
    const [runError, setRunError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);

    const refresh = useCallback(() => {
        chrome.runtime.sendMessage({ type: 'authenticity:getJob' }, (response: unknown) => {
            const record = response as { job?: AuthenticityJobState | null };
            if (record?.job) setJob(record.job);
            if (record?.job?.report) setReport(record.job.report);
        });
        void sessionGet<AuthenticityReport>(AUTHENTICITY_REPORT_STORAGE_KEY).then((stored) => {
            if (stored) setReport(stored);
        });
    }, []);

    const refreshSelectionPreview = useCallback(async (): Promise<void> => {
        const tabId = await queryActiveTabId();
        if (!tabId) {
            setSelectionPreview('');
            return;
        }
        const selection = await getSelectionFromTab(tabId);
        setSelectionPreview(selection.text.slice(0, 160));
    }, []);

    useEffect(() => {
        void loadAuthenticitySettings().then(setSettings);
        refresh();
        void refreshSelectionPreview();
        const interval = window.setInterval(refresh, 800);
        const previewInterval = window.setInterval(() => {
            void refreshSelectionPreview();
        }, 1500);
        const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
            if (changes[AUTHENTICITY_JOB_STORAGE_KEY] || changes[AUTHENTICITY_REPORT_STORAGE_KEY]) {
                refresh();
            }
            if (changes.authenticitySettings) {
                void loadAuthenticitySettings().then(setSettings);
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => {
            window.clearInterval(interval);
            window.clearInterval(previewInterval);
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [refresh, refreshSelectionPreview]);

    useEffect(() => {
        if (scopeChoice !== 'full_page') {
            setDenseSiteWarning(false);
            return;
        }
        void (async () => {
            const tabId = await queryActiveTabId();
            if (!tabId) return;
            const ctx = await getPageContextFromTab(tabId);
            setDenseSiteWarning(ctx?.isDenseSite ?? false);
        })();
    }, [scopeChoice]);

    const cancelJob = (): void => {
        chrome.runtime.sendMessage({ type: 'authenticity:cancel' });
    };

    const openOptions = (): void => {
        void chrome.runtime.openOptionsPage();
    };

    const runAnalysis = async (): Promise<void> => {
        if (!settings?.enabled) return;
        setRunError(null);
        setRunning(true);

        const tabId = await queryActiveTabId();
        if (!tabId) {
            setRunError(t('sidepanel.errors.noActiveTab'));
            setRunning(false);
            return;
        }

        const tab = await chrome.tabs.get(tabId);
        const url = tab.url ?? '';
        if (!url.startsWith('http')) {
            setRunError(t('sidepanel.errors.httpOnly'));
            setRunning(false);
            return;
        }

        const selection = await getSelectionFromTab(tabId);
        const pageContext = scopeChoice !== 'selection' ? await getPageContextFromTab(tabId) : null;

        if (scopeChoice === 'selection' && !selection.text) {
            setRunError(t('sidepanel.errors.selectTextFirst'));
            setRunning(false);
            return;
        }

        if (scopeChoice === 'full_page' && !settings.allowFullPage) {
            setRunError(t('sidepanel.errors.fullPageDisabled'));
            setRunning(false);
            return;
        }

        if (scopeChoice === 'full_page' && !pageContext?.mainText.trim()) {
            setRunError(t('sidepanel.errors.extractFailed'));
            setRunning(false);
            return;
        }

        const hostname = new URL(url).hostname;
        const scopeRequest = buildScopeRequest(scopeChoice, selection, pageContext);

        chrome.runtime.sendMessage(
            {
                type: 'authenticity:analyze',
                tabId,
                scopeRequest,
                selectionText: scopeRequest.text ?? selection.text,
                pageTitle: tab.title ?? '',
                url,
                hostname,
            },
            (response: unknown) => {
                setRunning(false);
                const record = response as { ok?: boolean; error?: string };
                if (record?.error) {
                    setRunError(record.error);
                }
                refresh();
            }
        );
    };

    if (!settings?.enabled) {
        return (
            <div className="container" style={{ padding: '1rem' }}>
                <h2 style={{ marginTop: 0 }}>{t('sidepanel.heading')}</h2>
                <p className="muted">{t('sidepanel.disabledHint')}</p>
                <button type="button" className="preset-btn" onClick={openOptions}>{t('sidepanel.openSettings')}</button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '1rem', maxWidth: '100%' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>{t('sidepanel.reportHeading')}</h2>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
                {t('sidepanel.advisory')}
                {!isAuthenticityPanelSidebar() ? t('sidepanel.reportTabNote') : ''}
            </p>

            <div className="card policy-card" style={{ marginTop: '0.75rem' }}>
                <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.75rem' }}>{t('sidepanel.scopeHeading')}</p>
                <div className="preset-buttons browsing-mode-buttons">
                    <button
                        type="button"
                        className={`preset-btn ${scopeChoice === 'selection' ? 'active' : ''}`}
                        onClick={() => { setScopeChoice('selection'); }}
                    >
                        {t('sidepanel.scopeSelection')}
                    </button>
                    <button
                        type="button"
                        className={`preset-btn ${scopeChoice === 'full_page' ? 'active' : ''}`}
                        disabled={!settings.allowFullPage}
                        onClick={() => { setScopeChoice('full_page'); }}
                    >
                        {t('sidepanel.scopeFullPage')}
                    </button>
                </div>
                {scopeChoice === 'selection' && selectionPreview ? (
                    <p className="muted" style={{ fontSize: '0.75rem', margin: '0.35rem 0 0' }}>
                        {t('sidepanel.selectedPreview', {
                            text: `${selectionPreview}${selectionPreview.length >= 160 ? '…' : ''}`,
                        })}
                    </p>
                ) : null}
                {scopeChoice === 'selection' && !selectionPreview ? (
                    <p className="muted" style={{ fontSize: '0.75rem', margin: '0.35rem 0 0' }}>
                        {t('sidepanel.selectTextHint')}
                    </p>
                ) : null}
                {scopeChoice === 'full_page' && denseSiteWarning ? (
                    <p className="muted" style={{ fontSize: '0.75rem', margin: '0.35rem 0 0', color: '#92400e' }}>
                        {t('sidepanel.denseSiteWarning')}
                    </p>
                ) : null}
                <button
                    type="button"
                    className="preset-btn active"
                    style={{ width: '100%', marginTop: '0.65rem' }}
                    disabled={running}
                    onClick={() => { void runAnalysis(); }}
                >
                    {running ? t('sidepanel.starting') : t('sidepanel.runAnalysis')}
                </button>
                {runError ? (
                    <p className="muted" style={{ color: '#b33', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                        {runError}
                    </p>
                ) : null}
            </div>

            {job && job.phase !== 'complete' && job.phase !== 'idle' && (
                <div className="card policy-card" style={{ marginTop: '0.75rem' }}>
                    <p style={{ margin: 0 }}>{localizeMessage(job.message, t)}</p>
                    <div style={{ height: '6px', background: '#eee', borderRadius: '4px', marginTop: '0.5rem' }}>
                        <div
                            style={{
                                width: `${job.progress}%`,
                                height: '100%',
                                background: '#5a78c8',
                                borderRadius: '4px',
                            }}
                        />
                    </div>
                    <button type="button" className="debug-toggle" style={{ marginTop: '0.5rem' }} onClick={cancelJob}>
                        {t('sidepanel.cancel')}
                    </button>
                </div>
            )}

            {job?.error && <p className="muted" style={{ color: '#b33' }}>{job.error}</p>}

            {!report && job?.phase !== 'searching' && job?.phase !== 'extracting' && (
                <p className="muted">{t('sidepanel.noReport')}</p>
            )}

            {report && (
                <div style={{ marginTop: '0.75rem' }}>
                    <p className="muted" style={{ fontSize: '0.8rem' }}>
                        {t('sidepanel.reportMeta', {
                            title: report.title,
                            scope: t(`sidepanel.scopeKind.${report.scope.kind}`),
                            mode: report.searchOnly ? t('sidepanel.searchOnly') : t('sidepanel.synthesis'),
                        })}
                    </p>
                    {[...report.t0Notes, ...(report.t1Notes ?? [])].length > 0 && (
                        <ul className="blocked-list" style={{ maxHeight: '120px' }}>
                            {[...report.t0Notes, ...(report.t1Notes ?? [])].map((note) => (
                                <li key={note} className="muted" style={{ fontSize: '0.8rem' }}>
                                    {localizeMessage(note, t)}
                                </li>
                            ))}
                        </ul>
                    )}
                    {report.claims.map((claim) => {
                        const assessment = report.assessments.find((a) => a.claimId === claim.id);
                        const refs = report.references.filter((r) => assessment?.referenceIds.includes(r.id));
                        const query = report.queries.find((q) => q.claimId === claim.id);
                        return (
                            <div key={claim.id} className="card policy-card" style={{ marginTop: '0.5rem' }}>
                                <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>
                                    {t('sidepanel.claim')} <span className="muted" style={{ fontWeight: 400 }}>({claim.type})</span>
                                </p>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{claim.text}</p>
                                {query && (
                                    <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                                        {t('sidepanel.searched', { query: query.query })}
                                    </p>
                                )}
                                {assessment && (
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                                        <span className="badge">{epistemicLabel(assessment.epistemicStatus, t)}</span>
                                        {' '}{localizeMessage(assessment.summary, t)}
                                    </p>
                                )}
                                {refs.length > 0 ? (
                                    <ul className="blocked-list" style={{ maxHeight: '200px', marginTop: '0.35rem' }}>
                                        {refs.map((ref) => (
                                            <li key={ref.id} className="blocked-item">
                                                <a href={ref.url} target="_blank" rel="noopener noreferrer">
                                                    {ref.title}
                                                </a>
                                                <p className="muted" style={{ fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                                                    {ref.snippetVerified ? t('sidepanel.snippetVerified') : t('sidepanel.snippetUnverified')} · {ref.stance}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="muted" style={{ fontSize: '0.8rem' }}>{t('sidepanel.noSources')}</p>
                                )}
                            </div>
                        );
                    })}
                    <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>
                        {localizeCompoundMessage(report.limitations, t, { count: report.references.length })}
                    </p>
                    {(report.queries.length > 0 || report.references.length > 0) && (
                        <details className="card policy-card" style={{ marginTop: '0.65rem' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                                {t('sidepanel.evidenceTrailSummary', {
                                    queries: report.queries.length,
                                    sources: report.references.length,
                                })}
                            </summary>
                            {report.queries.length > 0 ? (
                                <ul className="blocked-list" style={{ maxHeight: '140px', marginTop: '0.5rem' }}>
                                    {report.queries.map((entry) => (
                                        <li key={`${entry.claimId}-${entry.query}`} className="muted" style={{ fontSize: '0.75rem' }}>
                                            <strong>{t('sidepanel.evidenceQuery')}:</strong> {entry.query}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            {report.references.length > 0 ? (
                                <ul className="blocked-list" style={{ maxHeight: '220px', marginTop: '0.5rem' }}>
                                    {report.references.map((ref) => (
                                        <li key={ref.id} className="blocked-item">
                                            <a href={ref.url} target="_blank" rel="noopener noreferrer">
                                                {ref.title || ref.url}
                                            </a>
                                            <p className="muted" style={{ fontSize: '0.75rem', margin: '0.2rem 0 0' }}>
                                                {ref.snippetVerified
                                                    ? t('sidepanel.snippetVerified')
                                                    : ref.fetchedAt
                                                      ? t('sidepanel.snippetUnverified')
                                                      : t('sidepanel.evidenceFetchFailed')}
                                                {' · '}{ref.stance}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}
