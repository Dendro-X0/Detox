/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import App from './App';
import DashboardShell from './dashboard/DashboardShell';
import OnboardingWizard from './OnboardingWizard';

export default function OptionsApp() {
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
            <DashboardShell title="SignalLens" subtitle="Loading your dashboard…">
                <div className="loading-container">
                    <div className="loading-spinner" />
                </div>
            </DashboardShell>
        );
    }

    if (showWizard) {
        return <OnboardingWizard onComplete={() => setShowWizard(false)} />;
    }

    return <App onRestartWizard={() => setShowWizard(true)} />;
}
