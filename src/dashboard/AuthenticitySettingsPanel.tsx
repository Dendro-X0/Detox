/// <reference types="chrome" />
import { useEffect, useMemo, useState } from 'react';
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
import { openAuthenticityPanel } from '../authenticity/open-panel';
import { useLocale } from '../i18n/LocaleContext';
import LlmModelSelector from './LlmModelSelector';
import LocalLlmEndpointField from './LocalLlmEndpointField';
import SlSelect from './components/SlSelect';

const SEARCH_PROVIDER_IDS: readonly AuthenticitySearchProvider[] = [
    'wikipedia',
    'claimreview',
    'brave',
    'custom',
    'none',
];

export default function AuthenticitySettingsPanel() {
    const { t } = useLocale();
    const [settings, setSettings] = useState<AuthenticitySettings>(DEFAULT_AUTHENTICITY_SETTINGS);
    const [quotaUsed, setQuotaUsed] = useState(0);

    const searchProviderOptions = useMemo(
        () =>
            SEARCH_PROVIDER_IDS.map((id) => ({
                value: id,
                label: t(`authenticity.searchProviders.${id}`),
            })),
        [t]
    );

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

    const openReportPanel = (): void => {
        void chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (tabId === undefined) return;
            void openAuthenticityPanel(tabId);
        });
    };

    return (
        <div className="card policy-card sl-authenticity-panel" id="authenticity-settings">
            <h3>{t('authenticity.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('authenticity.description')}
            </p>

            <div className="sl-authenticity-actions">
                <button
                    type="button"
                    className="preset-btn"
                    disabled={!settings.enabled}
                    onClick={openReportPanel}
                >
                    {t('authenticity.openSidePanel')}
                </button>
            </div>

            <label className="sl-check-row">
                <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => persist({ ...settings, enabled: e.target.checked })}
                />
                <span>{t('authenticity.enable')}</span>
            </label>

            <div className="sl-form-grid sl-form-grid--compact">
                <div className="sl-form-field">
                    <span className="sl-form-label">{t('authenticity.dailyQuotaUsed')}</span>
                    <span className="sl-form-value">{quotaUsed} / {settings.dailyQuota}</span>
                </div>
                <div className="sl-form-field">
                    <label className="sl-form-label" htmlFor="authenticity-quota-cap">{t('authenticity.dailyQuotaCap')}</label>
                    <input
                        id="authenticity-quota-cap"
                        type="number"
                        min={1}
                        max={200}
                        className="sl-input sl-input--narrow"
                        value={settings.dailyQuota}
                        onChange={(e) => persist({ ...settings, dailyQuota: Number(e.target.value) })}
                    />
                </div>
            </div>

            <h4 className="sl-subsection-title">{t('authenticity.tiersHeading')}</h4>
            <div className="sl-check-list">
                <label className="sl-check-row">
                    <input
                        type="checkbox"
                        checked={settings.tierT0}
                        onChange={(e) => persist({ ...settings, tierT0: e.target.checked })}
                    />
                    <span>{t('authenticity.tierT0')}</span>
                </label>
                <label className="sl-check-row">
                    <input
                        type="checkbox"
                        checked={settings.tierT1}
                        onChange={(e) => persist({ ...settings, tierT1: e.target.checked })}
                    />
                    <span>{t('authenticity.tierT1')}</span>
                </label>
                <label className="sl-check-row">
                    <input
                        type="checkbox"
                        checked={settings.tierT2}
                        onChange={(e) => persist({ ...settings, tierT2: e.target.checked })}
                    />
                    <span>{t('authenticity.tierT2')}</span>
                </label>
                <label className="sl-check-row">
                    <input
                        type="checkbox"
                        checked={settings.tierT3}
                        onChange={(e) => persist({ ...settings, tierT3: e.target.checked })}
                    />
                    <span>{t('authenticity.tierT3')}</span>
                </label>
                <label className="sl-check-row">
                    <input
                        type="checkbox"
                        checked={settings.searchOnlyDefault}
                        onChange={(e) => persist({ ...settings, searchOnlyDefault: e.target.checked })}
                    />
                    <span>{t('authenticity.searchOnlyDefault')}</span>
                </label>
            </div>

            <h4 className="sl-subsection-title">{t('authenticity.scopeHeading')}</h4>
            <label className="sl-check-row">
                <input
                    type="checkbox"
                    checked={settings.allowFullPage}
                    onChange={(e) => persist({ ...settings, allowFullPage: e.target.checked })}
                />
                <span>{t('authenticity.allowFullPage')}</span>
            </label>

            <h4 className="sl-subsection-title">{t('authenticity.searchHeading')}</h4>
            <div className="sl-form-stack">
                <SlSelect
                    id="authenticity-search-provider"
                    label={t('authenticity.provider')}
                    value={settings.searchProvider}
                    onChange={(searchProvider) =>
                        persist({ ...settings, searchProvider: searchProvider as AuthenticitySearchProvider })
                    }
                    options={searchProviderOptions}
                />
                {settings.searchProvider === 'claimreview' ? (
                    <div className="sl-form-field">
                        <label className="sl-form-label" htmlFor="authenticity-factcheck-key">{t('authenticity.factCheckApiKey')}</label>
                        <input
                            id="authenticity-factcheck-key"
                            type="password"
                            className="sl-input"
                            placeholder={t('authenticity.factCheckApiKeyPlaceholder')}
                            value={settings.factCheckApiKey}
                            onChange={(e) => persist({ ...settings, factCheckApiKey: e.target.value })}
                        />
                    </div>
                ) : null}
                {settings.searchProvider === 'brave' ? (
                    <div className="sl-form-field">
                        <label className="sl-form-label" htmlFor="authenticity-brave-key">{t('authenticity.braveApiKey')}</label>
                        <input
                            id="authenticity-brave-key"
                            type="password"
                            className="sl-input"
                            placeholder={t('authenticity.braveApiKeyPlaceholder')}
                            value={settings.braveApiKey}
                            onChange={(e) => persist({ ...settings, braveApiKey: e.target.value })}
                        />
                    </div>
                ) : null}
                {settings.searchProvider === 'custom' ? (
                    <div className="sl-form-field">
                        <label className="sl-form-label" htmlFor="authenticity-custom-search">{t('authenticity.customSearchUrl')}</label>
                        <input
                            id="authenticity-custom-search"
                            type="url"
                            className="sl-input"
                            placeholder={t('authenticity.customSearchPlaceholder')}
                            value={settings.customSearchUrl}
                            onChange={(e) => persist({ ...settings, customSearchUrl: e.target.value })}
                        />
                    </div>
                ) : null}
            </div>

            <h4 className="sl-subsection-title">{t('authenticity.llmHeading')}</h4>
            <LocalLlmEndpointField
                endpoint={settings.llmEndpoint}
                onEndpointChange={(llmEndpoint) => persist({ ...settings, llmEndpoint })}
            />
            <div className="sl-form-stack">
                <div className="sl-form-field">
                    <label className="sl-form-label" htmlFor="authenticity-llm-key">{t('authenticity.llmApiKey')}</label>
                    <input
                        id="authenticity-llm-key"
                        type="password"
                        className="sl-input"
                        placeholder={t('authenticity.llmApiKeyPlaceholder')}
                        value={settings.llmApiKey}
                        onChange={(e) => persist({ ...settings, llmApiKey: e.target.value })}
                    />
                </div>
                <LlmModelSelector
                    endpoint={settings.llmEndpoint}
                    apiKey={settings.llmApiKey}
                    value={settings.llmModel}
                    onChange={(llmModel) => persist({ ...settings, llmModel })}
                />
            </div>

            <p className="sl-form-hint">
                {t('authenticity.limitsHint', {
                    claims: settings.maxClaims,
                    results: settings.maxSearchResults,
                })}
            </p>
        </div>
    );
}
