import { loadEnabledModIds } from '../core/mods/mod-enablement-store';
import { loadInstalledMods } from '../core/mods/installed-mod-store';
import { ensureInstalledModAssets } from '../core/mods/mod-package-installer';
import { REQUIRED_MOD_IDS, setInstalledModIdCache } from './mod-manifest';
import { setLocalPackLoader } from '../core/runtime/provider-loader';
import { ensureOnnxProvidersLoaded } from './detectors/ensure-onnx-providers';
import { canLoadMod, canUnloadMod, loadMod, unloadMod } from './mod-loaders';

const loadedModIds = new Set<string>();

/**
 * Loads bundled mods according to `enabledModIds` in storage.
 * Safe to call repeatedly to apply enable/disable changes.
 */
export async function loadBuiltinMods(): Promise<readonly string[]> {
    setLocalPackLoader(ensureOnnxProvidersLoaded);
    const installed = await loadInstalledMods();
    setInstalledModIdCache(installed.map((record) => record.modId));
    const enabled = await loadEnabledModIds();
    const target = new Set(enabled);
    for (const required of REQUIRED_MOD_IDS) {
        target.add(required);
    }

    for (const modId of [...loadedModIds]) {
        if (!target.has(modId) && canUnloadMod(modId)) {
            unloadMod(modId);
            loadedModIds.delete(modId);
        }
    }

    for (const modId of target) {
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
