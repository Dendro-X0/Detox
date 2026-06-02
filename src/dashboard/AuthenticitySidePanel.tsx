/// <reference types="chrome" />
import { useCallback, useEffect, useState } from 'react';
import type { AuthenticityJobState, AuthenticityReport } from '../mods/analyzers/authenticity/types';
import {
    AUTHENTICITY_JOB_STORAGE_KEY,
    AUTHENTICITY_REPORT_STORAGE_KEY,
} from '../mods/analyzers/authenticity/constants';
import { sessionGet } from '../core/storage/extension-session';
import { loadAuthenticitySettings } from '../mods/analyzers/authenticity/settings-store';
import { isAuthenticityPanelSidebar } from '../authenticity/open-panel';

function epistemicLabel(status: string): string {
    switch (status) {
        case 'unsupported':
            return 'Sources not found';
        case 'disputed':
            return 'Disputed';
        case 'partially_supported':
            return 'Partially supported';
        default:
            return 'Unknown / verify';
    }
}

export default function AuthenticitySidePanel() {
    const [job, setJob] = useState<AuthenticityJobState | null>(null);
    const [report, setReport] = useState<AuthenticityReport | null>(null);
    const [enabled, setEnabled] = useState(false);

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

    useEffect(() => {
        void loadAuthenticitySettings().then((s) => setEnabled(s.enabled));
        refresh();
        const interval = window.setInterval(refresh, 800);
        const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
            if (changes[AUTHENTICITY_JOB_STORAGE_KEY] || changes[AUTHENTICITY_REPORT_STORAGE_KEY]) {
                refresh();
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => {
            window.clearInterval(interval);
            chrome.storage.onChanged.removeListener(listener);
        };
    }, [refresh]);

    const cancelJob = (): void => {
        chrome.runtime.sendMessage({ type: 'authenticity:cancel' });
    };

    const openOptions = (): void => {
        void chrome.runtime.openOptionsPage();
    };

    if (!enabled) {
        return (
            <div className="container" style={{ padding: '1rem' }}>
                <h2 style={{ marginTop: 0 }}>Authenticity assist</h2>
                <p className="muted">Feature is off. Enable it in Options → Authenticity assist.</p>
                <button className="preset-btn" onClick={openOptions}>Open settings</button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '1rem', maxWidth: '100%' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Authenticity report</h2>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
                Advisory only — never blocks content. Select text → right-click → Analyze selection.
                {!isAuthenticityPanelSidebar() ? ' (Report opens in a dedicated tab on this browser.)' : ''}
            </p>

            {job && job.phase !== 'complete' && job.phase !== 'idle' && (
                <div className="card policy-card" style={{ marginTop: '0.75rem' }}>
                    <p style={{ margin: 0 }}>{job.message}</p>
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
                    <button className="debug-toggle" style={{ marginTop: '0.5rem' }} onClick={cancelJob}>
                        Cancel
                    </button>
                </div>
            )}

            {job?.error && <p className="muted" style={{ color: '#b33' }}>{job.error}</p>}

            {!report && job?.phase !== 'searching' && job?.phase !== 'extracting' && (
                <p className="muted">No report yet. Analyze a selection to begin.</p>
            )}

            {report && (
                <div style={{ marginTop: '0.75rem' }}>
                    <p className="muted" style={{ fontSize: '0.8rem' }}>
                        {report.title} · {report.searchOnly ? 'Search only' : 'Synthesis'}
                    </p>
                    {report.t0Notes.length > 0 && (
                        <ul className="blocked-list" style={{ maxHeight: '120px' }}>
                            {report.t0Notes.map((note) => (
                                <li key={note} className="muted" style={{ fontSize: '0.8rem' }}>{note}</li>
                            ))}
                        </ul>
                    )}
                    {report.claims.map((claim) => {
                        const assessment = report.assessments.find((a) => a.claimId === claim.id);
                        const refs = report.references.filter((r) => assessment?.referenceIds.includes(r.id));
                        const query = report.queries.find((q) => q.claimId === claim.id);
                        return (
                            <div key={claim.id} className="card policy-card" style={{ marginTop: '0.5rem' }}>
                                <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>Claim</p>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{claim.text}</p>
                                {query && (
                                    <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                                        Searched: {query.query}
                                    </p>
                                )}
                                {assessment && (
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                                        <span className="badge">{epistemicLabel(assessment.epistemicStatus)}</span>
                                        {' '}{assessment.summary}
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
                                                    {ref.snippetVerified ? 'Snippet verified' : 'Snippet unverified'} · {ref.stance}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="muted" style={{ fontSize: '0.8rem' }}>No sources listed.</p>
                                )}
                            </div>
                        );
                    })}
                    <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>{report.limitations}</p>
                </div>
            )}
        </div>
    );
}
