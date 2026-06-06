/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import App from './App';
import DashboardShell from './dashboard/DashboardShell';
import { LocaleProvider, useLocale } from './i18n/LocaleContext';
import OnboardingWizard, { type WizardCompleteOptions } from './OnboardingWizard';

function OptionsAppContent() {
    const { t } = useLocale();
    const [ready, setReady] = useState(false);
    const [showWizard, setShowWizard] = useState(false);

    useEffect(() => {
        document.body.classList.add('sl-app');
        const forceWizard = new URLSearchParams(window.location.search).has('wizard');
        chrome.storage.local.get('onboardingComplete', (result: unknown) => {
            const record = result as { readonly onboardingComplete?: boolean };
            setShowWizard(forceWizard || !record.onboardingComplete);
            setReady(true);
        });
    }, []);

    if (!ready) {
        return (
            <DashboardShell title={t('common.appName')} subtitle={t('options.loadingSubtitle')}>
                <div className="loading-container">
                    <div className="loading-spinner" />
                </div>
            </DashboardShell>
        );
    }

    const handleWizardComplete = (options?: WizardCompleteOptions): void => {
        const openedForInstallWizard = new URLSearchParams(window.location.search).has('wizard');
        if (openedForInstallWizard) {
            const url = new URL(window.location.href);
            url.searchParams.delete('wizard');
            window.history.replaceState({}, '', `${url.pathname}${url.hash}`);
        }
        setShowWizard(false);
        if (options?.openDashboard) {
            window.location.hash = 'overview';
            return;
        }
        if (options?.openSample) {
            return;
        }
        if (openedForInstallWizard) {
            window.setTimeout(() => {
                window.close();
            }, 150);
        }
    };

    if (showWizard) {
        return <OnboardingWizard onComplete={handleWizardComplete} />;
    }

    return <App onRestartWizard={() => { setShowWizard(true); }} />;
}

export default function OptionsApp() {
    return (
        <LocaleProvider>
            <OptionsAppContent />
        </LocaleProvider>
    );
}
