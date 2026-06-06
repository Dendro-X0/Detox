import { useLocale } from '../i18n/LocaleContext';

export default function LanguageSettingsPanel() {
    const { localeId, availableLocales, setLocaleId, t } = useLocale();

    return (
        <div className="card policy-card">
            <h3>{t('settings.language.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('settings.language.description')}
            </p>
            <div className="sl-choice-list">
                {availableLocales.map((locale) => (
                    <button
                        key={locale.id}
                        type="button"
                        className={`sl-choice-item${localeId === locale.id ? ' is-active' : ''}`}
                        onClick={() => { setLocaleId(locale.id); }}
                    >
                        <span>
                            <strong>{locale.nativeName}</strong>
                            {locale.nativeName !== locale.englishName ? (
                                <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                                    {locale.englishName}
                                </span>
                            ) : null}
                        </span>
                    </button>
                ))}
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
                {t('settings.language.saved')}
            </p>
        </div>
    );
}
