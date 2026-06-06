import { InferenceRuntimeHost } from './inference-runtime-host';
import { loadRoutingSettings } from './routing-settings';
import { subscribeToEnabledModChanges } from '../mods/mod-enablement-store';
import { loadBuiltinMods } from '../../mods/load-builtin-mods';
import { isFullBuild } from '../../build-profile';

let inlineRuntimeHost: InferenceRuntimeHost | null = null;
let inlineBootstrapPromise: Promise<InferenceRuntimeHost> | null = null;

export async function ensureInlineRuntimeHost(): Promise<InferenceRuntimeHost> {
    if (inlineRuntimeHost) return inlineRuntimeHost;
    if (!inlineBootstrapPromise) {
        inlineBootstrapPromise = (async () => {
            await loadBuiltinMods('inference');
            subscribeToEnabledModChanges(() => {
                void loadBuiltinMods('inference');
            });
            inlineRuntimeHost = new InferenceRuntimeHost();
            void inlineRuntimeHost.ensureInitialized();
            return inlineRuntimeHost;
        })();
    }
    return inlineBootstrapPromise;
}

/** ONNX local-pack inference needs the offscreen DOM context on Chrome MV3. */
export async function needsOffscreenRuntime(): Promise<boolean> {
    if (!isFullBuild()) return false;
    const routing = await loadRoutingSettings();
    return routing.primaryMode === 'local-pack';
}

export function resetInlineRuntimeHostForTests(): void {
    inlineRuntimeHost = null;
    inlineBootstrapPromise = null;
}
