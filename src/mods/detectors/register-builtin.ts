import { registerProvider } from '../../core/registry/provider-registry';
import { heuristicKeywordsProvider } from './heuristic-keywords/provider';
import { DEFAULT_ROUTING_SETTINGS } from '../../core/types/routing';

let registered = false;

/** Register detector mods for the active build profile. */
export async function registerBuiltinDetectors(): Promise<void> {
    if (registered) return;

    registerProvider(heuristicKeywordsProvider);

    if (import.meta.env.VITE_BUILD_PROFILE === 'full') {
        const remoteApi = await import('./remote-api/provider');
        const remoteConfig = await import('./remote-api/config');
        registerProvider(remoteApi.remoteApiProvider);
        remoteConfig.refreshRemoteApiCache(DEFAULT_ROUTING_SETTINGS.remoteApi);
    }

    registered = true;
}

export { heuristicKeywordsProvider } from './heuristic-keywords/provider';
