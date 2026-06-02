/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import {
    DEFAULT_AUTHENTICITY_SETTINGS,
    type AuthenticitySearchProvider,
    type AuthenticitySettings,
} from '../mods/analyzers/authenticity/settings';
import {
    getAuthenticityQuota,
    loadAuthenticitySettings,
    saveAuthenticitySettings,
} from '../mods/analyzers/authenticity/settings-store';

export default function AuthenticitySettingsPanel() {
    const [settings, setSettings] = useState<AuthenticitySettings>(DEFAULT_AUTHENTICITY_SETTINGS);
    const [quotaUsed, setQuotaUsed] = useState(0);

    useEffect(() => {
        void loadAuthenticitySettings().then((loaded) => {
            setSettings(loaded);
            setQuotaUsed(getAuthenticityQuota().used);
        });
    }, []);

    const persist = (next: AuthenticitySettings): void => {
        setSettings(next);
        void saveAuthenticitySettings(next);
    };

    return (
        <div className="card policy-card">
            <h3>Authenticity assist (experimental)</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                Selection-first research helper. Flags are advisory only — content is never hidden.
                Default: search-only (zero LLM tokens).
            </p>

            <label className="switch" style={{ marginBottom: '0.75rem' }}>
                <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => persist({ ...settings, enabled: e.target.checked })}
                />
                <span className="slider" />
            </label>
            <span className="label" style={{ marginLeft: '0.5rem' }}>Enable authenticity assist</span>

            <div className="stat-row">
                <span className="label">Daily quota used</span>
                <span className="value">
                    {quotaUsed} / {settings.dailyQuota}
                </span>
            </div>

            <div className="stat-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <span className="label">Daily quota cap</span>
                <input
                    type="number"
                    min={1}
                    max={200}
                    value={settings.dailyQuota}
                    onChange={(e) => persist({ ...settings, dailyQuota: Number(e.target.value) })}
                    style={{ width: '72px', padding: '0.35rem' }}
                />
            </div>

            <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.95rem' }}>Tiers</h4>
            <label className="stat-row" style={{ gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    checked={settings.tierT0}
                    onChange={(e) => persist({ ...settings, tierT0: e.target.checked })}
                />
                <span>T0 — local heuristics (free)</span>
            </label>
            <label className="stat-row" style={{ gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    checked={settings.tierT2}
                    onChange={(e) => persist({ ...settings, tierT2: e.target.checked })}
                />
                <span>T2 — search API</span>
            </label>
            <label className="stat-row" style={{ gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    checked={settings.tierT3}
                    onChange={(e) => persist({ ...settings, tierT3: e.target.checked })}
                />
                <span>T3 — LLM compare snippets (user endpoint)</span>
            </label>
            <label className="stat-row" style={{ gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    checked={settings.searchOnlyDefault}
                    onChange={(e) => persist({ ...settings, searchOnlyDefault: e.target.checked })}
                />
                <span>Search-only by default (recommended)</span>
            </label>

            <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.95rem' }}>Search</h4>
            <select
                value={settings.searchProvider}
                onChange={(e) =>
                    persist({ ...settings, searchProvider: e.target.value as AuthenticitySearchProvider })
                }
                style={{ width: '100%', padding: '0.35rem', marginBottom: '0.5rem' }}
            >
                <option value="wikipedia">Wikipedia (free, demo)</option>
                <option value="brave">Brave Search API</option>
                <option value="custom">Custom search endpoint</option>
                <option value="none">None</option>
            </select>
            {settings.searchProvider === 'brave' && (
                <input
                    type="password"
                    placeholder="Brave API key"
                    value={settings.braveApiKey}
                    onChange={(e) => persist({ ...settings, braveApiKey: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem', marginBottom: '0.5rem' }}
                />
            )}
            {settings.searchProvider === 'custom' && (
                <input
                    type="url"
                    placeholder="https://api.example.com/search?q={query}"
                    value={settings.customSearchUrl}
                    onChange={(e) => persist({ ...settings, customSearchUrl: e.target.value })}
                    style={{ width: '100%', padding: '0.35rem', marginBottom: '0.5rem' }}
                />
            )}

            <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.95rem' }}>LLM (T3)</h4>
            <input
                type="url"
                placeholder="OpenAI-compatible chat completions URL"
                value={settings.llmEndpoint}
                onChange={(e) => persist({ ...settings, llmEndpoint: e.target.value })}
                style={{ width: '100%', padding: '0.35rem', marginBottom: '0.5rem' }}
            />
            <input
                type="password"
                placeholder="API key (optional)"
                value={settings.llmApiKey}
                onChange={(e) => persist({ ...settings, llmApiKey: e.target.value })}
                style={{ width: '100%', padding: '0.35rem', marginBottom: '0.5rem' }}
            />
            <input
                type="text"
                placeholder="Model id"
                value={settings.llmModel}
                onChange={(e) => persist({ ...settings, llmModel: e.target.value })}
                style={{ width: '100%', padding: '0.35rem' }}
            />

            <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}>
                Max {settings.maxClaims} claims · {settings.maxSearchResults} results per query. URLs must come from search results — the model cannot add links.
            </p>
        </div>
    );
}
