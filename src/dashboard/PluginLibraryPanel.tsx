/// <reference types="chrome" />
import { useCallback, useEffect, useState } from 'react';
import { getBuildProfile, isFullBuild } from '../build-profile';
import {
    MOD_CATALOG,
    isModAvailableInProfile,
    isModInstalledUnlock,
    isModUnlocked,
    type ModDescriptor,
    type ModKind,
} from '../mods/mod-manifest';
import {
    getInstalledMods,
    isModInstalled,
    loadInstalledMods,
    subscribeToInstalledModChanges,
} from '../core/mods/installed-mod-store';
import {
    installModPackageFromJson,
    uninstallModPackage,
    type InstallModResult,
} from '../core/mods/mod-package-installer';
import type { ModInstallProgress } from '../core/mods/mod-package-types';
import {
    isRequiredMod,
    loadEnabledModIds,
    setModEnabled,
    subscribeToEnabledModChanges,
} from '../core/mods/mod-enablement-store';
import { getLocalizedModFields } from '../i18n/mod-catalog';
import { useLocale } from '../i18n/LocaleContext';

const PLUGIN_SECTION_KINDS: readonly ModKind[] = ['hint', 'detector', 'action'];

type ModRowProps = {
    readonly mod: ModDescriptor;
    readonly enabled: boolean;
    readonly unlocked: boolean;
    readonly bundled: boolean;
    readonly installed: boolean;
    readonly onToggle: (modId: string, next: boolean) => void;
    readonly onUninstall: (modId: string) => void;
    readonly bundledBadge: string;
    readonly installedBadge: string;
    readonly alwaysOnBadge: string;
    readonly notInProfileNote: string;
    readonly uninstallLabel: string;
};

function ModRow({
    mod,
    enabled,
    unlocked,
    bundled,
    installed,
    onToggle,
    onUninstall,
    bundledBadge,
    installedBadge,
    alwaysOnBadge,
    notInProfileNote,
    uninstallLabel,
    t,
}: ModRowProps & { readonly t: (key: string, v?: Record<string, string | number>) => string }) {
    const required = isRequiredMod(mod.id);
    const locked = required || !unlocked;
    const localized = getLocalizedModFields(mod, t);

    return (
        <div className={`sl-mod-card${enabled ? ' is-enabled' : ''}`}>
            <div className="sl-mod-card-header">
                <span className="pack-name">{localized.name}</span>
                <div className="sl-mod-badges">
                    {bundled ? <span className="sl-status-badge sl-status-badge--bundled">{bundledBadge}</span> : null}
                    {installed && !bundled ? (
                        <span className="sl-status-badge sl-status-badge--installed">{installedBadge}</span>
                    ) : null}
                    {required && unlocked ? (
                        <span className="sl-status-badge sl-status-badge--required">{alwaysOnBadge}</span>
                    ) : null}
                </div>
                {!required ? (
                    <label className="switch sl-mod-toggle">
                        <input
                            type="checkbox"
                            checked={enabled}
                            disabled={locked}
                            onChange={(e) => onToggle(mod.id, e.target.checked)}
                        />
                        <span className="slider" />
                    </label>
                ) : null}
            </div>
            <p className="sl-mod-description">{localized.description}</p>
            <div className="sl-mod-meta">
                <span>{localized.permissionsSummary}</span>
                <span className="sl-mod-meta-sep">·</span>
                <span>{localized.sizeLabel}</span>
            </div>
            {!unlocked ? <p className="sl-mod-footnote">{notInProfileNote}</p> : null}
            {installed && !bundled ? (
                <button className="sl-btn-text" type="button" onClick={() => onUninstall(mod.id)}>
                    {uninstallLabel}
                </button>
            ) : null}
        </div>
    );
}

function formatProgress(progress: ModInstallProgress | null, t: (key: string, v?: Record<string, string | number>) => string): string {
    if (!progress) return '';
    if (progress.phase === 'verify') return t('plugins.progress.verify');
    if (progress.phase === 'download') {
        const pct =
            progress.bytesTotal > 0
                ? Math.round((progress.bytesLoaded / progress.bytesTotal) * 100)
                : 0;
        return t('plugins.progress.download', {
            file: progress.filePath ?? t('plugins.progress.downloadDefaultFile'),
            percent: pct,
        });
    }
    if (progress.phase === 'complete') return t('plugins.progress.complete');
    return progress.message ?? t('plugins.progress.failed');
}

export default function PluginLibraryPanel() {
    const { t } = useLocale();
    const profile = getBuildProfile();
    const [enabledIds, setEnabledIds] = useState<readonly string[]>([]);
    const [installedIds, setInstalledIds] = useState<readonly string[]>([]);
    const [installProgress, setInstallProgress] = useState<ModInstallProgress | null>(null);
    const [installError, setInstallError] = useState<string | null>(null);

    const refresh = useCallback(() => {
        void loadEnabledModIds().then(setEnabledIds);
        void loadInstalledMods().then((records) => setInstalledIds(records.map((r) => r.modId)));
    }, []);

    useEffect(() => {
        refresh();
        subscribeToEnabledModChanges(setEnabledIds);
        subscribeToInstalledModChanges((records) => setInstalledIds(records.map((r) => r.modId)));
    }, [refresh]);

    const onToggle = (modId: string, next: boolean): void => {
        if (!isModUnlocked(modId, profile)) {
            setInstallError(next ? t('plugins.errors.notInCoreBuild') : null);
            return;
        }
        void setModEnabled(modId, next).then(() => refresh());
    };

    const enableMods = (mods: readonly ModDescriptor[]): void => {
        void (async () => {
            for (const mod of mods) {
                if (isModUnlocked(mod.id, profile) && !isRequiredMod(mod.id)) {
                    await setModEnabled(mod.id, true);
                }
            }
            refresh();
        })();
    };

    const finishInstall = async (result: InstallModResult): Promise<void> => {
        if (!result.ok) {
            setInstallError(result.error);
            setInstallProgress(null);
            return;
        }
        setInstallError(null);
        await setModEnabled(result.modId, true);
        refresh();
        setInstallProgress(null);
    };

    const installFromFile = (): void => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.signallens-mod.json,application/json';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            setInstallError(null);
            try {
                const raw = JSON.parse(await file.text()) as unknown;
                const result = await installModPackageFromJson(raw, setInstallProgress);
                await finishInstall(result);
            } catch {
                setInstallError(t('plugins.errors.invalidPackage'));
                setInstallProgress(null);
            }
        };
        input.click();
    };

    const installFromUrl = (): void => {
        const url = window.prompt(t('plugins.errors.urlPrompt'));
        if (!url?.trim()) return;
        setInstallError(null);
        void (async () => {
            try {
                const controller = new AbortController();
                const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
                const response = await fetch(url.trim(), { signal: controller.signal });
                window.clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const raw = (await response.json()) as unknown;
                const result = await installModPackageFromJson(raw, setInstallProgress);
                await finishInstall(result);
            } catch (error) {
                const message =
                    error instanceof Error && error.name === 'AbortError'
                        ? t('plugins.errors.downloadTimeout')
                        : error instanceof Error
                          ? error.message
                          : t('plugins.errors.downloadFailed');
                setInstallError(message);
                setInstallProgress(null);
            }
        })();
    };

    const onUninstall = (modId: string): void => {
        void (async () => {
            await setModEnabled(modId, false);
            await uninstallModPackage(modId);
            refresh();
        })();
    };

    const modsByKind = PLUGIN_SECTION_KINDS.map((kind) => ({
        kind,
        label: t(`plugins.sections.${kind}`),
        description: t(`plugins.sectionDescriptions.${kind}`),
        mods: MOD_CATALOG.filter((mod) => mod.kind === kind),
    })).filter((section) => section.mods.length > 0);

    const lockedMods = MOD_CATALOG.filter((mod) => !isModUnlocked(mod.id, profile));
    const advancedCount = lockedMods.length;

    const lockedCount = MOD_CATALOG.filter(
        (mod) => !isModUnlocked(mod.id, profile) && mod.profiles.includes('full')
    ).length;

    const modRowLabels = {
        bundledBadge: t('plugins.badges.bundled'),
        installedBadge: t('plugins.badges.installed'),
        alwaysOnBadge: t('plugins.badges.alwaysOn'),
        notInProfileNote: t('plugins.notInProfile'),
        uninstallLabel: t('plugins.uninstallPackage'),
    };

    return (
        <div className="card policy-card sl-plugins-library">
            <h3>{t('plugins.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('plugins.description')}
                {!isFullBuild() && lockedCount > 0 ? t('plugins.unlockCount', { count: lockedCount }) : ''}
            </p>

            {modsByKind.map(({ kind, label, description, mods }) => {
                const visibleMods = mods.filter((mod) => isModUnlocked(mod.id, profile));
                if (visibleMods.length === 0) {
                    return null;
                }
                const enabledInSection = visibleMods.filter((mod) => enabledIds.includes(mod.id)).length;
                const optionalMods = visibleMods.filter((mod) => !isRequiredMod(mod.id));

                return (
                    <section key={kind} className="sl-mod-section">
                        <div className="sl-mod-section-header">
                            <div>
                                <h4 className="sl-subsection-title">
                                    {label}
                                    <span className="sl-section-count">
                                        {t('plugins.sectionEnabled', {
                                            enabled: enabledInSection,
                                            total: visibleMods.length,
                                        })}
                                    </span>
                                </h4>
                                <p className="muted sl-section-desc">{description}</p>
                            </div>
                            {kind === 'hint' && optionalMods.length > 0 ? (
                                <button
                                    type="button"
                                    className="sl-btn-text"
                                    onClick={() => enableMods(optionalMods)}
                                >
                                    {t('plugins.enableAllHints')}
                                </button>
                            ) : null}
                        </div>
                        <div className="sl-mod-list">
                            {visibleMods.map((mod) => (
                                <ModRow
                                    key={mod.id}
                                    mod={mod}
                                    enabled={enabledIds.includes(mod.id)}
                                    unlocked={isModUnlocked(mod.id, profile)}
                                    bundled={isModAvailableInProfile(mod.id, profile)}
                                    installed={isModInstalled(mod.id) || isModInstalledUnlock(mod.id)}
                                    onToggle={onToggle}
                                    onUninstall={onUninstall}
                                    t={t}
                                    {...modRowLabels}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}

            <details className="sl-install-details sl-plugins-advanced">
                <summary>
                    {advancedCount > 0
                        ? t('plugins.advancedSectionSummary', { count: advancedCount })
                        : t('plugins.advancedInstall')}
                </summary>

                {lockedMods.length > 0 ? (
                    <section className="sl-mod-section sl-mod-section--advanced">
                        <h4 className="sl-subsection-title">{t('plugins.advancedLockedHeading')}</h4>
                        <p className="muted sl-section-desc">{t('plugins.advancedLockedDescription')}</p>
                        <div className="sl-mod-list">
                            {lockedMods.map((mod) => (
                                <ModRow
                                    key={mod.id}
                                    mod={mod}
                                    enabled={enabledIds.includes(mod.id)}
                                    unlocked={false}
                                    bundled={isModAvailableInProfile(mod.id, profile)}
                                    installed={isModInstalled(mod.id) || isModInstalledUnlock(mod.id)}
                                    onToggle={onToggle}
                                    onUninstall={onUninstall}
                                    t={t}
                                    {...modRowLabels}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}

                <p className="muted" style={{ fontSize: '0.85rem', marginTop: lockedMods.length > 0 ? '1rem' : '0.5rem' }}>
                    {t('plugins.advancedInstallDescription')}
                </p>
                <div className="preset-buttons" style={{ marginTop: '0.5rem' }}>
                    <button type="button" className="preset-btn" onClick={installFromFile}>
                        {t('plugins.installPackage')}
                    </button>
                    <button type="button" className="preset-btn" onClick={installFromUrl}>
                        {t('plugins.installFromUrl')}
                    </button>
                </div>
                {installProgress ? (
                    <p className="muted" style={{ fontSize: '0.85rem' }}>{formatProgress(installProgress, t)}</p>
                ) : null}
                {installError ? (
                    <p className="sl-form-error">{installError}</p>
                ) : null}
                {installedIds.length > 0 ? (
                    <p className="muted" style={{ fontSize: '0.8rem' }}>
                        {t('plugins.installedPackages', {
                            names: getInstalledMods().map((r) => r.name).join(', '),
                        })}
                    </p>
                ) : null}
            </details>
        </div>
    );
}
