import type { BuildProfile } from '../build-profile';

export type ModKind = 'adapter' | 'detector' | 'action';

export type ModDescriptor = {
    readonly id: string;
    readonly kind: ModKind;
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly permissionsSummary: string;
    /** Human-readable bundle hint for the library UI. */
    readonly sizeLabel: string;
    /** Profiles that include this mod in the build. `'core'` mods ship in every build. */
    readonly profiles: readonly BuildProfile[];
    /** Runtime registry id (adapter site id, detector id, or action id). */
    readonly runtimeId: string;
    /** Cannot be disabled in the plugin library. */
    readonly required?: boolean;
};

/** Mods required for baseline filtering on any profile. */
export const REQUIRED_MOD_IDS = [
    'adapter-generic',
    'detector-heuristic-keywords',
    'action-dim',
] as const;

/**
 * Catalog of bundled mods. Used for build profile selection and the plugin library.
 */
export const MOD_CATALOG: readonly ModDescriptor[] = [
    {
        id: 'adapter-generic',
        kind: 'adapter',
        name: 'Generic fallback',
        version: '1.0.0',
        description: 'Extracts posts and comments on sites without a dedicated adapter.',
        permissionsSummary: 'Reads page DOM on matched origins.',
        sizeLabel: 'Included',
        profiles: ['core', 'full'],
        runtimeId: 'generic',
        required: true,
    },
    {
        id: 'adapter-reddit',
        kind: 'adapter',
        name: 'Reddit',
        version: '1.0.0',
        description: 'Targets Reddit feed posts and comment threads.',
        permissionsSummary: 'Reads reddit.com DOM structure.',
        sizeLabel: '~12 KB',
        profiles: ['full'],
        runtimeId: 'reddit',
    },
    {
        id: 'adapter-youtube',
        kind: 'adapter',
        name: 'YouTube',
        version: '1.0.0',
        description: 'Targets YouTube comments and related feed items.',
        permissionsSummary: 'Reads youtube.com DOM structure.',
        sizeLabel: '~11 KB',
        profiles: ['full'],
        runtimeId: 'youtube',
    },
    {
        id: 'adapter-quora',
        kind: 'adapter',
        name: 'Quora',
        version: '1.0.0',
        description: 'Targets Quora answers and discussion threads.',
        permissionsSummary: 'Reads quora.com DOM structure.',
        sizeLabel: '~10 KB',
        profiles: ['full'],
        runtimeId: 'quora',
    },
    {
        id: 'detector-heuristic-keywords',
        kind: 'detector',
        name: 'Heuristic keywords',
        version: '1.0.0',
        description: 'Local keyword matching using your block and topic lists.',
        permissionsSummary: 'No network; runs on extracted text only.',
        sizeLabel: 'Included',
        profiles: ['core', 'full'],
        runtimeId: 'heuristic-keywords',
        required: true,
    },
    {
        id: 'detector-remote-api',
        kind: 'detector',
        name: 'Remote API',
        version: '1.0.0',
        description: 'Optional cloud classifier when you configure an endpoint.',
        permissionsSummary: 'Sends extracted text to your configured API URL.',
        sizeLabel: '~4 KB',
        profiles: ['full'],
        runtimeId: 'remote-api',
    },
    {
        id: 'detector-local-pack',
        kind: 'detector',
        name: 'Local ONNX pack',
        version: '1.0.0',
        description: 'On-device model pack for stronger classification.',
        permissionsSummary: 'Loads bundled ONNX weights from extension storage.',
        sizeLabel: '~2–8 MB',
        profiles: ['full'],
        runtimeId: 'local-pack',
    },
    {
        id: 'detector-onnx-pack',
        kind: 'detector',
        name: 'ONNX pack (legacy alias)',
        version: '1.0.0',
        description: 'Legacy detector id kept for compatibility with older settings.',
        permissionsSummary: 'Same ONNX session as local pack.',
        sizeLabel: 'Shared with local pack',
        profiles: ['full'],
        runtimeId: 'onnx-pack',
    },
    {
        id: 'action-dim',
        kind: 'action',
        name: 'Dim',
        version: '1.0.0',
        description: 'Softens matched content with lower opacity and grayscale.',
        permissionsSummary: 'Updates inline styles on matched elements.',
        sizeLabel: 'Included',
        profiles: ['core', 'full'],
        runtimeId: 'dim',
        required: true,
    },
    {
        id: 'action-blur',
        kind: 'action',
        name: 'Blur',
        version: '1.0.0',
        description: 'Blurs matched content until you choose to reveal it.',
        permissionsSummary: 'Updates inline styles on matched elements.',
        sizeLabel: '~3 KB',
        profiles: ['full'],
        runtimeId: 'blur',
    },
    {
        id: 'action-collapse',
        kind: 'action',
        name: 'Collapse',
        version: '1.0.0',
        description: 'Collapses matched blocks behind a compact summary row.',
        permissionsSummary: 'Updates inline styles on matched elements.',
        sizeLabel: '~3 KB',
        profiles: ['full'],
        runtimeId: 'collapse',
    },
] as const;

const MOD_BY_RUNTIME_ID = new Map(
    MOD_CATALOG.map((mod) => [`${mod.kind}:${mod.runtimeId}`, mod.id] as const)
);

export function getModsForProfile(profile: BuildProfile): readonly ModDescriptor[] {
    return MOD_CATALOG.filter((mod) => mod.profiles.includes('core') || mod.profiles.includes(profile));
}

export function isModAvailableInProfile(modId: string, profile: BuildProfile): boolean {
    return getModsForProfile(profile).some((mod) => mod.id === modId);
}

/** Installed signed packages unlock mods not shipped in the active build profile. */
let installedModIdSet: ReadonlySet<string> = new Set();

export function setInstalledModIdCache(ids: readonly string[]): void {
    installedModIdSet = new Set(ids);
}

export function isModInstalledUnlock(modId: string): boolean {
    return installedModIdSet.has(modId);
}

export function isModUnlocked(modId: string, profile: BuildProfile): boolean {
    return isModAvailableInProfile(modId, profile) || isModInstalledUnlock(modId);
}

export function modIdForRuntime(kind: ModKind, runtimeId: string): string | null {
    return MOD_BY_RUNTIME_ID.get(`${kind}:${runtimeId}`) ?? null;
}

export function isDetectorModEnabled(runtimeDetectorId: string): boolean {
    const modId = modIdForRuntime('detector', runtimeDetectorId);
    if (!modId) return true;
    return isModEnabledInCache(modId);
}

export function isActionModEnabled(runtimeActionId: string): boolean {
    const modId = modIdForRuntime('action', runtimeActionId);
    if (!modId) return true;
    return isModEnabledInCache(modId);
}

export function isAdapterModEnabled(runtimeAdapterId: string): boolean {
    const modId = modIdForRuntime('adapter', runtimeAdapterId);
    if (!modId) return true;
    return isModEnabledInCache(modId);
}

/** Avoid circular import with enablement store — set by store on load. */
let enabledModIdSet: ReadonlySet<string> = new Set(
    MOD_CATALOG.filter((mod) => mod.required).map((mod) => mod.id)
);

export function setEnabledModIdCache(ids: readonly string[]): void {
    enabledModIdSet = new Set(ids);
}

function isModEnabledInCache(modId: string): boolean {
    return enabledModIdSet.has(modId);
}

/** @deprecated Use isModAvailableInProfile + mod enablement store */
export function isModEnabled(modId: string, profile: BuildProfile): boolean {
    return isModAvailableInProfile(modId, profile);
}
