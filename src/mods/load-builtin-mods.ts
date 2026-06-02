import type { BuildProfile } from '../build-profile';
import { getBuildProfile } from '../build-profile';
import { getModsForProfile } from './mod-manifest';
import { registerBuiltinActions } from './actions/register-builtin';
import { registerBuiltinDetectors } from './detectors/register-builtin';
import { loadSiteAdapterMods } from './adapters/load-site-adapters';
import { ensureOnnxProvidersLoaded } from './detectors/ensure-onnx-providers';
import { setLocalPackLoader } from '../core/runtime/provider-loader';

let loadPromise: Promise<readonly string[]> | null = null;

/**
 * Loads bundled mods for the active build profile.
 * Safe to call multiple times; returns enabled mod ids after first load.
 */
export async function loadBuiltinMods(profile: BuildProfile = getBuildProfile()): Promise<readonly string[]> {
    if (loadPromise !== null) return loadPromise;

    loadPromise = (async () => {
        setLocalPackLoader(ensureOnnxProvidersLoaded);
        await registerBuiltinActions();
        await registerBuiltinDetectors();
        await loadSiteAdapterMods();
        return getModsForProfile(profile).map((mod) => mod.id);
    })();

    return loadPromise;
}
