import { useEffect, useState } from 'react';
import { getRollupSnapshot, type PeriodScanStats } from '../core/storage/scan-stats-store';
import { useLocale } from '../i18n/LocaleContext';

type RollupPair = {
    readonly today: PeriodScanStats;
    readonly last7Days: PeriodScanStats;
};

export default function OverviewActivityPanel() {
    const { t } = useLocale();
    const [rollup, setRollup] = useState<RollupPair>({
        today: { scanned: 0, filtered: 0 },
        last7Days: { scanned: 0, filtered: 0 },
    });

    useEffect(() => {
        void getRollupSnapshot().then(setRollup);
        const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
            if (area === 'local' && changes.scanStatsRollup) {
                void getRollupSnapshot().then(setRollup);
            }
        };
        chrome.storage.onChanged.addListener(onChanged);
        return () => chrome.storage.onChanged.removeListener(onChanged);
    }, []);

    const isEmpty = rollup.today.scanned === 0 && rollup.last7Days.scanned === 0;

    return (
        <div className="card policy-card sl-activity-card">
            <h3>{t('settings.overview.activityHeading')}</h3>
            {isEmpty ? (
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    {t('settings.overview.activityEmpty')}
                </p>
            ) : (
                <div className="sl-stats-inline">
                    <div>
                        <span className="value">{rollup.today.scanned}</span>
                        <span className="label">{t('settings.overview.activityScannedToday')}</span>
                    </div>
                    <div>
                        <span className="value">{rollup.today.filtered}</span>
                        <span className="label">{t('settings.overview.activityFilteredToday')}</span>
                    </div>
                    <div>
                        <span className="value">{rollup.last7Days.scanned}</span>
                        <span className="label">{t('settings.overview.activityScanned7d')}</span>
                    </div>
                    <div>
                        <span className="value">{rollup.last7Days.filtered}</span>
                        <span className="label">{t('settings.overview.activityFiltered7d')}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
