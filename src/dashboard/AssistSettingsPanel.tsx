/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import {
    loadAssistSettings,
    saveAssistSettings,
} from '../assist/assist-settings-store';
import { loadAssistQuota } from '../assist/assist-quota-store';
import { DEFAULT_ASSIST_SETTINGS } from '../assist/types';
import type { AssistSearchEngineId, AssistSettings } from '../assist/types';
import { useLocale } from '../i18n/LocaleContext';

const ENGINE_IDS: readonly AssistSearchEngineId[] = [
    'duckduckgo',
    'google',
    'bing',
    'custom',
];

export default function AssistSettingsPanel() {
    const { t } = useLocale();
    const [settings, setSettings] = useState<AssistSettings>(DEFAULT_ASSIST_SETTINGS);
    const [quotaUsed, setQuotaUsed] = useState(0);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        void loadAssistSettings().then(setSettings);
        void loadAssistQuota().then((quota) => setQuotaUsed(quota.used));
    }, []);

    const persist = async (next: AssistSettings): Promise<void> => {
        setSettings(next);
        await saveAssistSettings(next);
        const quota = await loadAssistQuota();
        setQuotaUsed(quota.used);
        setStatus(t('assist.settings.saved'));
        window.setTimeout(() => setStatus(null), 1500);
    };

    return (
        <div className="card policy-card">
            <h3>{t('assist.settings.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('assist.settings.description')}
            </p>

            <label className="sl-check-row">
                <input
                    type="checkbox"
                    checked={settings.selectionToolbarEnabled}
                    onChange={(e) => {
                        void persist({ ...settings, selectionToolbarEnabled: e.target.checked });
                    }}
                />
                <span>{t('assist.settings.toolbarLabel')}</span>
            </label>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                {t('assist.settings.toolbarHint')}
            </p>

            <label className="sl-check-row" style={{ marginTop: '1rem' }}>
                <input
                    type="checkbox"
                    checked={settings.pageUnderstandEnabled}
                    onChange={(e) => {
                        void persist({ ...settings, pageUnderstandEnabled: e.target.checked });
                    }}
                />
                <span>{t('assist.settings.pageUnderstandLabel')}</span>
            </label>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                {t('assist.settings.pageUnderstandHint')}
            </p>
            {settings.pageUnderstandEnabled ? (
                <button
                    type="button"
                    className="preset-btn"
                    style={{ marginTop: '0.65rem' }}
                    onClick={() => {
                        void chrome.runtime.sendMessage({ type: 'assist:outlinePage' }, (response) => {
                            const record = response as { ok?: boolean; error?: string } | undefined;
                            if (record?.ok) {
                                setStatus(t('assist.settings.outlineStarted'));
                            } else if (record?.error) {
                                const message =
                                    record.error === 'assist.quota.exhausted'
                                        ? t('assist.errors.quotaExhausted')
                                        : record.error.startsWith('assist.')
                                          ? t(record.error)
                                          : record.error;
                                setStatus(message);
                            }
                            window.setTimeout(() => setStatus(null), 2500);
                        });
                    }}
                >
                    {t('assist.settings.outlineActiveTab')}
                </button>
            ) : null}

            <label className="sl-form-field" style={{ marginTop: '1rem' }}>
                <span className="sl-form-label">{t('assist.settings.engineLabel')}</span>
                <select
                    className="sl-input"
                    value={settings.searchEngineId}
                    onChange={(e) => {
                        void persist({
                            ...settings,
                            searchEngineId: e.target.value as AssistSearchEngineId,
                        });
                    }}
                >
                    {ENGINE_IDS.map((id) => (
                        <option key={id} value={id}>
                            {t(`assist.settings.engines.${id}`)}
                        </option>
                    ))}
                </select>
            </label>

            {settings.searchEngineId === 'custom' ? (
                <label className="sl-form-field" style={{ marginTop: '0.75rem' }}>
                    <span className="sl-form-label">{t('assist.settings.customUrlLabel')}</span>
                    <input
                        type="url"
                        className="sl-input"
                        value={settings.customSearchUrlTemplate}
                        placeholder="https://example.com/search?q=%s"
                        onChange={(e) => {
                            setSettings({ ...settings, customSearchUrlTemplate: e.target.value });
                        }}
                        onBlur={(e) => {
                            void persist({
                                ...settings,
                                customSearchUrlTemplate: e.target.value,
                            });
                        }}
                    />
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                        {t('assist.settings.customUrlHint')}
                    </span>
                </label>
            ) : null}

            <div className="sl-form-field" style={{ marginTop: '1rem' }}>
                <span className="sl-form-label">{t('assist.settings.dailyQuotaUsed')}</span>
                <span className="sl-form-value">
                    {quotaUsed} / {settings.dailyActionQuota}
                </span>
            </div>
            <label className="sl-form-field" style={{ marginTop: '0.75rem' }}>
                <span className="sl-form-label">{t('assist.settings.dailyQuotaCap')}</span>
                <input
                    type="number"
                    className="sl-input"
                    min={1}
                    max={500}
                    value={settings.dailyActionQuota}
                    onChange={(e) => {
                        void persist({
                            ...settings,
                            dailyActionQuota: Number(e.target.value),
                        });
                    }}
                />
            </label>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                {t('assist.settings.dailyQuotaHint')}
            </p>

            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0, marginTop: '1rem' }}>
                {t('assist.settings.contextMenuHint')}
            </p>
            {status ? <p className="muted" style={{ marginBottom: 0 }}>{status}</p> : null}
        </div>
    );
}
