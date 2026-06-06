import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    applyBrowsingMode,
    clearActiveBrowsingMode,
    BUILTIN_BROWSING_MODES,
    loadActiveBrowsingModeId,
    type BrowsingModeId,
} from '../core/modes/browsing-modes';
import { useLocale } from '../i18n/LocaleContext';

type BrowsingModesPanelProps = {
    readonly onModeApplied?: () => void;
    readonly onCustomized?: () => void;
};

export default function BrowsingModesPanel({ onModeApplied, onCustomized }: BrowsingModesPanelProps) {
    const { t } = useLocale();
    const [activeModeId, setActiveModeId] = useState<BrowsingModeId | null>(null);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback((): void => {
        void loadActiveBrowsingModeId().then(setActiveModeId);
    }, []);

    useEffect(() => {
        refresh();
        const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
            if (area === 'local' && changes.activeBrowsingModeId) {
                const next = changes.activeBrowsingModeId.newValue;
                setActiveModeId(typeof next === 'string' ? (next as BrowsingModeId) : null);
            }
        };
        chrome.storage.onChanged.addListener(onChanged);
        return () => chrome.storage.onChanged.removeListener(onChanged);
    }, [refresh]);

    const selectMode = async (modeId: BrowsingModeId): Promise<void> => {
        setSaving(true);
        await applyBrowsingMode(modeId);
        setActiveModeId(modeId);
        setSaving(false);
        onModeApplied?.();
    };

    const activeDescription = useMemo(() => {
        if (!activeModeId) return null;
        return t(`browsingModes.${activeModeId}.description`);
    }, [activeModeId, t]);

    return (
        <div className="card policy-card browsing-modes-card">
            <h3>{t('browsingModes.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('browsingModes.description')}
            </p>
            <div className="preset-buttons browsing-mode-buttons">
                {BUILTIN_BROWSING_MODES.map((mode) => (
                    <button
                        key={mode.id}
                        type="button"
                        className={`preset-btn ${activeModeId === mode.id ? 'active' : ''}`}
                        disabled={saving}
                        onClick={() => { void selectMode(mode.id); }}
                    >
                        {t(`browsingModes.${mode.id}.label`)}
                    </button>
                ))}
            </div>
            {activeModeId === null ? (
                <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
                    {t('browsingModes.customNote')}
                </p>
            ) : (
                <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
                    {activeDescription}
                </p>
            )}
            {activeModeId !== null && onCustomized ? (
                <button
                    type="button"
                    className="preset-btn"
                    style={{ marginTop: '0.75rem', width: '100%' }}
                    onClick={() => {
                        void clearActiveBrowsingMode().then(() => {
                            setActiveModeId(null);
                            onCustomized();
                        });
                    }}
                >
                    {t('browsingModes.markCustom')}
                </button>
            ) : null}
        </div>
    );
}

export async function markSettingsCustomized(): Promise<void> {
    await clearActiveBrowsingMode();
}
