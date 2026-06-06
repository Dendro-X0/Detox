import { useLocale } from '../i18n/LocaleContext';

export default function GettingStartedPanel() {
    const { t } = useLocale();

    return (
        <div className="card policy-card getting-started-card">
            <h3>{t('settings.overview.gettingStarted.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('settings.overview.gettingStarted.description')}
            </p>
            <ul className="sl-handoff-list">
                <li>{t('settings.overview.gettingStarted.tipBrowse')}</li>
                <li>{t('settings.overview.gettingStarted.tipReveal')}</li>
                <li>{t('settings.overview.gettingStarted.tipRules')}</li>
                <li>{t('settings.overview.gettingStarted.tipAuthenticity')}</li>
            </ul>
        </div>
    );
}
