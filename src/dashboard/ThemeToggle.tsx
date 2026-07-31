import { useTheme } from '../theme/ThemeProvider';
import { useLocale } from '../i18n/LocaleContext';
import type { UiThemePreference } from '../theme/types';

const THEME_OPTIONS: readonly UiThemePreference[] = ['system', 'light', 'dark'];

export default function ThemeToggle({
    compact = false,
    popup = false,
}: {
    readonly compact?: boolean;
    readonly popup?: boolean;
}) {
    const { preference, setPreference } = useTheme();
    const { t } = useLocale();

    if (popup) {
        return (
            <div className="sl-theme-toggle sl-theme-toggle--popup" role="group" aria-label={t('theme.heading')}>
                {THEME_OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        className={`sl-theme-toggle-btn sl-theme-toggle-btn--popup${preference === option ? ' is-active' : ''}`}
                        onClick={() => setPreference(option)}
                        title={t(`theme.options.${option}`)}
                        aria-label={t(`theme.options.${option}`)}
                        aria-pressed={preference === option}
                    >
                        <span className="sl-theme-toggle-icon" aria-hidden="true">
                            {t(`theme.icon.${option}`)}
                        </span>
                        <span className="sl-theme-toggle-label">{t(`theme.options.${option}`)}</span>
                    </button>
                ))}
            </div>
        );
    }

    if (compact) {
        const cycle: Record<UiThemePreference, UiThemePreference> = {
            system: 'dark',
            dark: 'light',
            light: 'system',
        };
        return (
            <button
                type="button"
                className="sl-btn sl-btn-ghost sl-theme-toggle-compact"
                onClick={() => setPreference(cycle[preference])}
                title={t(`theme.options.${preference}`)}
                aria-label={t(`theme.options.${preference}`)}
            >
                {t(`theme.icon.${preference}`)}
            </button>
        );
    }

    return (
        <div className="sl-theme-toggle" role="group" aria-label={t('theme.heading')}>
            {THEME_OPTIONS.map((option) => (
                <button
                    key={option}
                    type="button"
                    className={`sl-theme-toggle-btn${preference === option ? ' is-active' : ''}`}
                    onClick={() => setPreference(option)}
                >
                    {t(`theme.options.${option}`)}
                </button>
            ))}
        </div>
    );
}
