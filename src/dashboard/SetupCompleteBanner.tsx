import { useEffect, useState } from 'react';
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

    useEffect(() => {
        try {
            setVisible(sessionStorage.getItem(WIZARD_COMPLETE_BANNER_KEY) === '1');
        } catch {
            setVisible(false);
        }
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

    return (
        <div className="sl-setup-banner sl-span-full" role="status">
            <div className="sl-setup-banner-body">
                <strong>{t('settings.overview.setupCompleteTitle')}</strong>
                <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    {t('settings.overview.setupCompleteBody')}
                </p>
            </div>
            <button type="button" className="sl-btn sl-btn-ghost" onClick={dismiss}>
                {t('common.dismiss')}
            </button>
        </div>
    );
}
