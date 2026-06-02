import type { InferenceProvider } from '../types/detector';
import { loadRoutingSettings } from '../runtime/routing-settings';
import { PRIMARY_PROVIDER_IDS } from '../runtime/constants';
import { HEURISTIC_DETECTOR_ID } from '../runtime/constants';
import { isDetectorModEnabled } from '../../mods/mod-manifest';

const providers = new Map<string, InferenceProvider>();

export function registerProvider(provider: InferenceProvider): void {
    providers.set(provider.id, provider);
}

export function unregisterProvider(id: string): void {
    providers.delete(id);
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
    if (
        typeof preferredDetectorId === 'string' &&
        providers.has(preferredDetectorId) &&
        isDetectorModEnabled(preferredDetectorId)
    ) {
        return preferredDetectorId;
    }

    const primaryId = PRIMARY_PROVIDER_IDS[routing.primaryMode];
    if (providers.has(primaryId) && isDetectorModEnabled(primaryId)) {
        return primaryId;
    }

    return HEURISTIC_DETECTOR_ID;
}

export async function resolveActiveProvider(): Promise<InferenceProvider> {
    const id = await resolveActiveProviderId();
    const provider = (isDetectorModEnabled(id) ? getProvider(id) : null) ?? getProvider(HEURISTIC_DETECTOR_ID);
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
