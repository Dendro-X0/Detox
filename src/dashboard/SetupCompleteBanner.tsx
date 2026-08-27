/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import { isExpressPresetId } from '../onboarding/express-presets';
import { useLocale } from '../i18n/LocaleContext';

export const WIZARD_COMPLETE_BANNER_KEY = 'sl-wizard-complete-banner';

export function markWizardCompleteBanner(): void {
    try {
        sessionStorage.setItem(WIZARD_COMPLETE_BANNER_KEY, '1');
    } catch {
        /* sessionStorage unavailable */
    }
}

export default function SetupCompleteBanner() {
    const { t } = useLocale();
    const [visible, setVisible] = useState(false);
    const [expressPresetId, setExpressPresetId] = useState<string | null>(null);

    useEffect(() => {
        try {
            setVisible(sessionStorage.getItem(WIZARD_COMPLETE_BANNER_KEY) === '1');
        } catch {
            setVisible(false);
        }
        void chrome.storage.local.get('expressPresetId').then((result) => {
            const id = (result as { readonly expressPresetId?: string }).expressPresetId;
            setExpressPresetId(id && isExpressPresetId(id) ? id : null);
        });
    }, []);

    if (!visible) return null;

    const dismiss = (): void => {
        try {
            sessionStorage.removeItem(WIZARD_COMPLETE_BANNER_KEY);
        } catch {
            /* ignore */
        }
        setVisible(false);
    };

    const presetLabel =
        expressPresetId !== null ? t(`wizard.expressPresets.${expressPresetId}.label`) : null;

    return (
        <div className="sl-setup-banner sl-span-full" role="status">
            <div className="sl-setup-banner-body">
                <strong>{t('settings.overview.setupCompleteTitle')}</strong>
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    {presetLabel
                        ? t('settings.overview.setupCompleteExpressBody', { preset: presetLabel })
                        : t('settings.overview.setupCompleteBody')}
                </p>
            </div>
            <button type="button" className="sl-btn sl-btn-ghost" onClick={dismiss}>
                {t('common.dismiss')}
            </button>
        </div>
    );
}
