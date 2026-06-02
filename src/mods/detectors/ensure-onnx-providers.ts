import { registerProvider, getProvider } from '../../core/registry/provider-registry';
import { LOCAL_PACK_DETECTOR_ID } from '../../core/runtime/constants';

let loadPromise: Promise<void> | null = null;

/**
 * Dynamically loads and registers ONNX detector providers when local pack is selected.
 * No-op in core builds or when providers are already registered.
 */
export async function ensureOnnxProvidersLoaded(): Promise<void> {
    if (import.meta.env.VITE_BUILD_PROFILE !== 'full') return;
    if (getProvider(LOCAL_PACK_DETECTOR_ID)) return;

    if (loadPromise === null) {
        loadPromise = (async () => {
            const fullDetectors = await import('./register-full-detectors');
            registerProvider(fullDetectors.localPackProvider);
            registerProvider(fullDetectors.onnxPackProvider);
        })();
    }

    await loadPromise;
}
