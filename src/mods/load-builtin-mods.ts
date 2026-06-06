import { loadEnabledModIds } from '../core/mods/mod-enablement-store';
import { loadInstalledMods } from '../core/mods/installed-mod-store';
import { ensureInstalledModAssets } from '../core/mods/mod-package-installer';
import { REQUIRED_MOD_IDS, setInstalledModIdCache } from './mod-manifest';
import { setLocalPackLoader } from '../core/runtime/provider-loader';
import { ensureOnnxProvidersLoaded } from './detectors/ensure-onnx-providers';
import { canLoadMod, canUnloadMod, loadMod, unloadMod } from './mod-loaders';

const loadedModIds = new Set<string>();

/** Background/offscreen inference only needs detector mods (no DOM adapters or actions). */
export type ModLoadScope = 'full' | 'inference';

const INFERENCE_REQUIRED_MOD_IDS = ['detector-heuristic-keywords'] as const;

function requiredModIdsForScope(scope: ModLoadScope): readonly string[] {
    return scope === 'inference' ? INFERENCE_REQUIRED_MOD_IDS : REQUIRED_MOD_IDS;
}

function isModInScope(modId: string, scope: ModLoadScope): boolean {
    return scope === 'full' || modId.startsWith('detector-');
}

/**
 * Loads bundled mods according to `enabledModIds` in storage.
 * Safe to call repeatedly to apply enable/disable changes.
 */
export async function loadBuiltinMods(scope: ModLoadScope = 'full'): Promise<readonly string[]> {
    setLocalPackLoader(ensureOnnxProvidersLoaded);
    const installed = await loadInstalledMods();
    setInstalledModIdCache(installed.map((record) => record.modId));
    const enabled = await loadEnabledModIds();
    const target = new Set(enabled);
    for (const required of requiredModIdsForScope(scope)) {
        target.add(required);
    }

    for (const modId of [...loadedModIds]) {
        if (!target.has(modId) && canUnloadMod(modId)) {
            unloadMod(modId);
            loadedModIds.delete(modId);
        }
    }

    for (const modId of target) {
        if (!isModInScope(modId, scope)) continue;
        if (loadedModIds.has(modId) || !canLoadMod(modId)) continue;
        const assetsReady = await ensureInstalledModAssets(modId);
        if (!assetsReady) continue;
        await loadMod(modId);
        loadedModIds.add(modId);
    }

    return [...loadedModIds];
}

export function getLoadedModIds(): readonly string[] {
    return [...loadedModIds];
}
