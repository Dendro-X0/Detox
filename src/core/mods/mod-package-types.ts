import type { ModKind } from '../../mods/mod-manifest';

export const MOD_PACKAGE_FORMAT = 'signallens-mod/1' as const;

export type ModPackageFile = {
    readonly relativePath: string;
    readonly url: string;
    readonly sha256: string;
    readonly sizeBytes: number;
};

/** Signed payload (everything except `signature`). */
export type ModPackagePayload = {
    readonly format: typeof MOD_PACKAGE_FORMAT;
    readonly modId: string;
    readonly version: string;
    readonly name: string;
    readonly kind: ModKind;
    readonly description?: string;
    readonly permissionsSummary?: string;
    readonly files?: readonly ModPackageFile[];
};

export type ModPackageManifest = ModPackagePayload & {
    readonly signature: string;
};

export type InstalledModFileRecord = {
    readonly relativePath: string;
    readonly sha256: string;
    readonly sizeBytes: number;
    readonly downloadedAt: string;
};

export type InstalledModRecord = {
    readonly modId: string;
    readonly version: string;
    readonly name: string;
    readonly kind: ModKind;
    readonly installedAt: string;
    readonly files: readonly InstalledModFileRecord[];
};

export type ModInstallProgress = {
    readonly modId: string;
    readonly phase: 'verify' | 'download' | 'complete' | 'error';
    readonly filePath?: string;
    readonly bytesLoaded: number;
    readonly bytesTotal: number;
    readonly message?: string;
};

export type InstalledModsStorageRecord = {
    readonly installedMods?: readonly InstalledModRecord[];
};
