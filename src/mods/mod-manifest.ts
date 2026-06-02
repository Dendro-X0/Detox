import type { BuildProfile } from '../build-profile';

export type ModKind = 'adapter' | 'detector' | 'action';

export type ModDescriptor = {
    readonly id: string;
    readonly kind: ModKind;
    readonly name: string;
    readonly version: string;
    /** Profiles that include this mod. `'core'` mods ship in every build. */
    readonly profiles: readonly BuildProfile[];
};

/**
 * Catalog of bundled mods. Used for build profile selection and future signed mod installs.
 */
export const MOD_CATALOG: readonly ModDescriptor[] = [
    { id: 'adapter-generic', kind: 'adapter', name: 'Generic fallback', version: '1.0.0', profiles: ['core', 'full'] },
    { id: 'adapter-reddit', kind: 'adapter', name: 'Reddit', version: '1.0.0', profiles: ['full'] },
    { id: 'adapter-youtube', kind: 'adapter', name: 'YouTube', version: '1.0.0', profiles: ['full'] },
    { id: 'adapter-quora', kind: 'adapter', name: 'Quora', version: '1.0.0', profiles: ['full'] },
    { id: 'detector-heuristic-keywords', kind: 'detector', name: 'Heuristic keywords', version: '1.0.0', profiles: ['core', 'full'] },
    { id: 'detector-remote-api', kind: 'detector', name: 'Remote API', version: '1.0.0', profiles: ['full'] },
    { id: 'detector-local-pack', kind: 'detector', name: 'Local ONNX pack', version: '1.0.0', profiles: ['full'] },
    { id: 'detector-onnx-pack', kind: 'detector', name: 'ONNX pack (legacy id)', version: '1.0.0', profiles: ['full'] },
    { id: 'action-dim', kind: 'action', name: 'Dim', version: '1.0.0', profiles: ['core', 'full'] },
    { id: 'action-blur', kind: 'action', name: 'Blur', version: '1.0.0', profiles: ['full'] },
    { id: 'action-collapse', kind: 'action', name: 'Collapse', version: '1.0.0', profiles: ['full'] },
] as const;

export function getModsForProfile(profile: BuildProfile): readonly ModDescriptor[] {
    return MOD_CATALOG.filter((mod) => mod.profiles.includes('core') || mod.profiles.includes(profile));
}

export function isModEnabled(modId: string, profile: BuildProfile): boolean {
    return getModsForProfile(profile).some((mod) => mod.id === modId);
}
