import type { SettingsTabId } from './settings-tabs';
import { useLocale } from '../i18n/LocaleContext';

type DashboardQuickLinksProps = {
    readonly onNavigate: (tabId: SettingsTabId) => void;
};

const ESSENTIAL_LINK_IDS: readonly SettingsTabId[] = ['filtering', 'rules'];
const ADVANCED_LINK_IDS: readonly SettingsTabId[] = ['plugins', 'privacy'];

export default function DashboardQuickLinks({ onNavigate }: DashboardQuickLinksProps) {
    const { t } = useLocale();

    const renderLink = (tabId: SettingsTabId) => (
        <button
            key={tabId}
            type="button"
            className="sl-quick-link-btn"
            onClick={() => onNavigate(tabId)}
        >
            <strong>{t(`settings.tabs.${tabId}`)}</strong>
            <span className="muted">{t(`settings.overview.quickLinks.${tabId}`)}</span>
        </button>
    );

    return (
        <div className="card policy-card sl-quick-links sl-span-full">
            <h3>{t('settings.overview.quickLinksEssentialHeading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('settings.overview.quickLinksEssentialHint')}
            </p>
            <div className="sl-quick-links-grid">{ESSENTIAL_LINK_IDS.map(renderLink)}</div>

            <details className="sl-install-details sl-quick-links-advanced">
                <summary>{t('settings.overview.quickLinksAdvancedHeading')}</summary>
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                    {t('settings.overview.quickLinksAdvancedHint')}
                </p>
                <div className="sl-quick-links-grid">{ADVANCED_LINK_IDS.map(renderLink)}</div>
            </details>
        </div>
    );
}
