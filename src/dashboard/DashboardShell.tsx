import type { ReactNode } from 'react';
import type { SettingsTabId } from './settings-tabs';

type DashboardTab = {
    readonly id: SettingsTabId;
    readonly label: string;
};

export type WizardProgressMeta = {
    readonly current: number;
    readonly total: number;
    readonly stepLabel: string;
    readonly stepOfLabel: string;
};

type DashboardShellProps = {
    readonly title: string;
    readonly subtitle?: string;
    readonly children: ReactNode;
    readonly footer?: ReactNode;
    readonly wizardProgress?: WizardProgressMeta;
    readonly wizardStepIndex?: number;
    readonly wizardStepLabels?: readonly string[];
    readonly headerActions?: ReactNode;
    readonly tabs?: readonly DashboardTab[];
    readonly activeTab?: SettingsTabId;
    readonly onTabChange?: (tabId: SettingsTabId) => void;
};

export default function DashboardShell({
    title,
    subtitle,
    children,
    footer,
    wizardProgress,
    wizardStepIndex,
    wizardStepLabels,
    headerActions,
    tabs,
    activeTab,
    onTabChange,
}: DashboardShellProps) {
    const showWizardProgress = wizardProgress !== undefined || (
        wizardStepIndex !== undefined &&
        wizardStepLabels !== undefined &&
        wizardStepLabels.length > 0
    );
    const totalSteps = wizardProgress?.total ?? wizardStepLabels?.length ?? 0;
    const currentStep = wizardProgress?.current ?? (wizardStepIndex !== undefined ? wizardStepIndex + 1 : 0);
    const progressPct = showWizardProgress && totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
    const progressStepLabel = wizardProgress?.stepLabel ?? wizardStepLabels?.[wizardStepIndex ?? 0] ?? '';
    const progressStepOf = wizardProgress?.stepOfLabel ?? `Step ${currentStep} of ${totalSteps}`;

    return (
        <div className="sl-shell">
            <header className="sl-shell-header">
                <div className="sl-shell-header-inner">
                    <div className="sl-brand">
                        <h1 className="sl-brand-title">{title}</h1>
                        {subtitle ? <p className="sl-brand-subtitle">{subtitle}</p> : null}
                    </div>
                    {headerActions ? <div className="sl-header-actions">{headerActions}</div> : null}
                </div>
                {tabs && tabs.length > 0 && activeTab && onTabChange ? (
                    <nav className="sl-tab-nav" aria-label="Settings categories">
                        <div className="sl-tab-nav-inner">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    className={`sl-tab-btn${activeTab === tab.id ? ' is-active' : ''}`}
                                    onClick={() => onTabChange(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </nav>
                ) : null}
            </header>

            <main className="sl-shell-main">
                {showWizardProgress ? (
                    <div className="sl-wizard-progress" aria-label="Setup progress">
                        <div className="sl-wizard-progress-meta">
                            <span>{progressStepOf}</span>
                            <span>{progressStepLabel}</span>
                        </div>
                        <div className="sl-wizard-progress-track">
                            <div className="sl-wizard-progress-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        {wizardStepLabels && wizardStepLabels.length > 0 && wizardStepIndex !== undefined ? (
                            <ul className="sl-wizard-steps">
                                {wizardStepLabels.map((label, index) => (
                                    <li
                                        key={label}
                                        className={`sl-wizard-step-pill${
                                            index === wizardStepIndex
                                                ? ' is-active'
                                                : index < wizardStepIndex
                                                  ? ' is-done'
                                                  : ''
                                        }`}
                                    >
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}
                {children}
            </main>

            {footer ? (
                <footer className="sl-shell-footer">
                    <div className="sl-shell-footer-inner">{footer}</div>
                </footer>
            ) : null}
        </div>
    );
}
