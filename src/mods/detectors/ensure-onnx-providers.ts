import { registerProvider, getProvider } from '../../core/registry/provider-registry';
import { LOCAL_PACK_DETECTOR_ID, ONNX_DETECTOR_ID } from '../../core/runtime/constants';
import { isModEnabled } from '../../core/mods/mod-enablement-store';

let loadPromise: Promise<void> | null = null;

export function resetOnnxProviderLoader(): void {
    loadPromise = null;
}

/**
 * Dynamically loads and registers ONNX detector providers when local pack is selected.
 * No-op in core builds, when mods are disabled, or when providers are already registered.
 */
export async function ensureOnnxProvidersLoaded(): Promise<void> {
    if (import.meta.env.VITE_BUILD_PROFILE !== 'full') return;
    if (!isModEnabled('detector-local-pack') && !isModEnabled('detector-onnx-pack')) return;
    if (getProvider(LOCAL_PACK_DETECTOR_ID) && getProvider(ONNX_DETECTOR_ID)) return;

    if (loadPromise === null) {
        loadPromise = (async () => {
            const fullDetectors = await import('./register-full-detectors');
            if (isModEnabled('detector-local-pack')) {
                registerProvider(fullDetectors.localPackProvider);
            }
            if (isModEnabled('detector-onnx-pack')) {
                registerProvider(fullDetectors.onnxPackProvider);
            }
        })();
    }

    await loadPromise;
}
