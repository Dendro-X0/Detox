import type { InferenceProvider } from '../types/detector';
import { loadRoutingSettings } from '../runtime/routing-settings';
import { PRIMARY_PROVIDER_IDS } from '../runtime/constants';
import { HEURISTIC_DETECTOR_ID } from '../runtime/constants';

const providers = new Map<string, InferenceProvider>();

export function registerProvider(provider: InferenceProvider): void {
    providers.set(provider.id, provider);
}

export function getProvider(id: string): InferenceProvider | null {
    return providers.get(id) ?? null;
}

export function listProviders(): readonly InferenceProvider[] {
    return [...providers.values()];
}

export async function resolveActiveProviderId(): Promise<string> {
    const routing = await loadRoutingSettings();

    const legacy = await chrome.storage.local.get(['preferredDetectorId']);
    const preferredDetectorId = (legacy as { readonly preferredDetectorId?: unknown }).preferredDetectorId;
    if (typeof preferredDetectorId === 'string' && providers.has(preferredDetectorId)) {
        return preferredDetectorId;
    }

    return PRIMARY_PROVIDER_IDS[routing.primaryMode];
}

export async function resolveActiveProvider(): Promise<InferenceProvider> {
    const id = await resolveActiveProviderId();
    const provider = getProvider(id) ?? getProvider(HEURISTIC_DETECTOR_ID);
    if (!provider) {
        throw new Error('No inference providers registered');
    }
    return provider;
}

export function getFallbackProvider(): InferenceProvider {
    const fallback = getProvider(HEURISTIC_DETECTOR_ID);
    if (!fallback) {
        throw new Error('Heuristic fallback provider is not registered');
    }
    return fallback;
}
