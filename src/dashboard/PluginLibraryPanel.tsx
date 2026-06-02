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
import { loadBuiltinMods } from '../mods/load-builtin-mods';

const KIND_ORDER: readonly ModKind[] = ['adapter', 'detector', 'action'];
const KIND_LABELS: Readonly<Record<ModKind, string>> = {
    adapter: 'Site adapters',
    detector: 'Detectors',
    action: 'Filter styles',
};

type ModRowProps = {
    readonly mod: ModDescriptor;
    readonly enabled: boolean;
    readonly unlocked: boolean;
    readonly bundled: boolean;
    readonly installed: boolean;
    readonly onToggle: (modId: string, next: boolean) => void;
    readonly onUninstall: (modId: string) => void;
};

function ModRow({ mod, enabled, unlocked, bundled, installed, onToggle, onUninstall }: ModRowProps) {
    const locked = isRequiredMod(mod.id) || !unlocked;

    return (
        <div
            className={`pack-option installable ${enabled ? 'selected' : ''}`}
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.35rem' }}
        >
            <div className="stat-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <span className="pack-name">{mod.name}</span>
                    <span className="pack-langs" style={{ marginLeft: '0.5rem' }}>{mod.kind}</span>
                    {bundled && <span className="badge" style={{ marginLeft: '0.35rem' }}>bundled</span>}
                    {installed && !bundled && (
                        <span className="badge" style={{ marginLeft: '0.35rem' }}>installed</span>
                    )}
                </div>
                <label
                    className="switch"
                    style={{ flexShrink: 0, marginBottom: 0, transform: 'scale(0.75)', transformOrigin: 'right center' }}
                >
                    <input
                        type="checkbox"
                        checked={enabled}
                        disabled={locked}
                        onChange={(e) => onToggle(mod.id, e.target.checked)}
                    />
                    <span className="slider" />
                </label>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{mod.description}</p>
            <div className="stat-row" style={{ fontSize: '0.75rem' }}>
                <span className="label">{mod.permissionsSummary}</span>
                <span className="value">{mod.sizeLabel}</span>
            </div>
            {!unlocked && (
                <span className="muted" style={{ fontSize: '0.75rem' }}>
                    Install a signed package to unlock (core build) or use `pnpm build:full`.
                </span>
            )}
            {locked && unlocked && (
                <span className="muted" style={{ fontSize: '0.75rem' }}>Required for baseline filtering</span>
            )}
            {installed && !bundled && (
                <button className="debug-toggle" onClick={() => onUninstall(mod.id)} style={{ alignSelf: 'flex-start' }}>
                    Uninstall package
                </button>
            )}
        </div>
    );
}

function formatProgress(progress: ModInstallProgress | null): string {
    if (!progress) return '';
    if (progress.phase === 'verify') return 'Verifying signature…';
    if (progress.phase === 'download') {
        const pct =
            progress.bytesTotal > 0
                ? Math.round((progress.bytesLoaded / progress.bytesTotal) * 100)
                : 0;
        return `Downloading ${progress.filePath ?? 'assets'}… ${pct}%`;
    }
    if (progress.phase === 'complete') return 'Install complete.';
    return progress.message ?? 'Install failed.';
}

export default function PluginLibraryPanel() {
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
        void setModEnabled(modId, next);
    };

    const finishInstall = async (result: InstallModResult): Promise<void> => {
        if (!result.ok) {
            setInstallError(result.error);
            setInstallProgress(null);
            return;
        }
        setInstallError(null);
        await loadBuiltinMods();
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
                setInstallError('Invalid package file.');
                setInstallProgress(null);
            }
        };
        input.click();
    };

    const installFromUrl = (): void => {
        const url = window.prompt('Mod package manifest URL (.signallens-mod.json):');
        if (!url?.trim()) return;
        setInstallError(null);
        void (async () => {
            try {
                const response = await fetch(url.trim());
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const raw = (await response.json()) as unknown;
                const result = await installModPackageFromJson(raw, setInstallProgress);
                await finishInstall(result);
            } catch (error) {
                setInstallError(error instanceof Error ? error.message : 'Download failed');
                setInstallProgress(null);
            }
        })();
    };

    const onUninstall = (modId: string): void => {
        void (async () => {
            await setModEnabled(modId, false);
            await uninstallModPackage(modId);
            await loadBuiltinMods();
            refresh();
        })();
    };

    const modsByKind = KIND_ORDER.map((kind) => ({
        kind,
        mods: MOD_CATALOG.filter((mod) => mod.kind === kind),
    }));

    const lockedCount = MOD_CATALOG.filter(
        (mod) => !isModUnlocked(mod.id, profile) && mod.profiles.includes('full')
    ).length;

    return (
        <div className="card policy-card">
            <h3>Plugin Library</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                Enable bundled mods or install signed packages to unlock full-build mods without rebuilding.
                {!isFullBuild() && lockedCount > 0
                    ? ` ${lockedCount} mod(s) can be unlocked via signed packages.`
                    : ''}
            </p>
            <div className="preset-buttons" style={{ marginBottom: '0.75rem' }}>
                <button className="preset-btn" onClick={installFromFile}>
                    Install package…
                </button>
                <button className="preset-btn" onClick={installFromUrl}>
                    Install from URL
                </button>
            </div>
            {installProgress && (
                <p className="muted" style={{ fontSize: '0.85rem' }}>{formatProgress(installProgress)}</p>
            )}
            {installError && (
                <p className="muted" style={{ fontSize: '0.85rem', color: '#b33' }}>{installError}</p>
            )}
            {installedIds.length > 0 && (
                <p className="muted" style={{ fontSize: '0.8rem' }}>
                    Installed packages: {getInstalledMods().map((r) => r.name).join(', ')}
                </p>
            )}
            {modsByKind.map(({ kind, mods }) => (
                <section key={kind} style={{ marginTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{KIND_LABELS[kind]}</h4>
                    <div className="pack-list">
                        {mods.map((mod) => (
                            <ModRow
                                key={mod.id}
                                mod={mod}
                                enabled={enabledIds.includes(mod.id)}
                                unlocked={isModUnlocked(mod.id, profile)}
                                bundled={isModAvailableInProfile(mod.id, profile)}
                                installed={isModInstalled(mod.id) || isModInstalledUnlock(mod.id)}
                                onToggle={onToggle}
                                onUninstall={onUninstall}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
