import type { ReactNode } from 'react';

type DashboardShellProps = {
    readonly title: string;
    readonly subtitle?: string;
    readonly children: ReactNode;
    readonly footer?: ReactNode;
    readonly wizardStepIndex?: number;
    readonly wizardStepLabels?: readonly string[];
};

export default function DashboardShell({
    title,
    subtitle,
    children,
    footer,
    wizardStepIndex,
    wizardStepLabels,
}: DashboardShellProps) {
    const showWizardProgress =
        wizardStepIndex !== undefined &&
        wizardStepLabels !== undefined &&
        wizardStepLabels.length > 0;
    const totalSteps = wizardStepLabels?.length ?? 0;
    const progressPct = showWizardProgress ? ((wizardStepIndex + 1) / totalSteps) * 100 : 0;

    return (
        <div className="sl-shell">
            <header className="sl-shell-header">
                <div className="sl-shell-header-inner">
                    <div className="sl-brand">
                        <h1 className="sl-brand-title">{title}</h1>
                        {subtitle ? <p className="sl-brand-subtitle">{subtitle}</p> : null}
                    </div>
                </div>
            </header>

            <main className="sl-shell-main">
                {showWizardProgress ? (
                    <div className="sl-wizard-progress" aria-label="Setup progress">
                        <div className="sl-wizard-progress-meta">
                            <span>
                                Step {wizardStepIndex + 1} of {totalSteps}
                            </span>
                            <span>{wizardStepLabels[wizardStepIndex]}</span>
                        </div>
                        <div className="sl-wizard-progress-track">
                            <div className="sl-wizard-progress-fill" style={{ width: `${progressPct}%` }} />
                        </div>
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
