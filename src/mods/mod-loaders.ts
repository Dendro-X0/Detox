import { registerEnforcementAction, unregisterEnforcementAction } from '../core/registry/action-registry';
import { registerProvider, unregisterProvider } from '../core/registry/provider-registry';
import { DEFAULT_ROUTING_SETTINGS } from '../core/types/routing';
import {
    HEURISTIC_DETECTOR_ID,
    LOCAL_PACK_DETECTOR_ID,
    REMOTE_API_DETECTOR_ID,
} from '../core/runtime/constants';
import { ONNX_DETECTOR_ID } from '../core/runtime/constants';
import { dimAction } from './actions/dim/action';
import { heuristicKeywordsProvider } from './detectors/heuristic-keywords/provider';
import { noisePatternsProvider } from './detectors/noise-patterns/provider';
import { resetOnnxProviderLoader } from './detectors/ensure-onnx-providers';
import { NOISE_PATTERNS_DETECTOR_ID } from './detectors/constants';

type ModLoader = () => Promise<void>;
type ModUnloader = () => void;

const MOD_LOADERS: Partial<Record<string, ModLoader>> = {
    'action-dim': async () => {
        registerEnforcementAction(dimAction);
    },
    'action-blur': async () => {
        const { blurAction } = await import('./actions/blur/action');
        registerEnforcementAction(blurAction);
    },
    'action-collapse': async () => {
        const { collapseAction } = await import('./actions/collapse/action');
        registerEnforcementAction(collapseAction);
    },
    'detector-heuristic-keywords': async () => {
        registerProvider(heuristicKeywordsProvider);
    },
    'detector-noise-patterns': async () => {
        registerProvider(noisePatternsProvider);
    },
    'detector-remote-api': async () => {
        const remoteApi = await import('./detectors/remote-api/provider');
        const remoteConfig = await import('./detectors/remote-api/config');
        registerProvider(remoteApi.remoteApiProvider);
        remoteConfig.refreshRemoteApiCache(DEFAULT_ROUTING_SETTINGS.remoteApi);
    },
    'detector-local-pack': async () => {
        const fullDetectors = await import('./detectors/register-full-detectors');
        registerProvider(fullDetectors.localPackProvider);
    },
    'detector-onnx-pack': async () => {
        const fullDetectors = await import('./detectors/register-full-detectors');
        registerProvider(fullDetectors.onnxPackProvider);
    },
};

const MOD_UNLOADERS: Partial<Record<string, ModUnloader>> = {
    'action-blur': () => unregisterEnforcementAction('blur'),
    'action-collapse': () => unregisterEnforcementAction('collapse'),
    'detector-noise-patterns': () => unregisterProvider(NOISE_PATTERNS_DETECTOR_ID),
    'detector-remote-api': () => unregisterProvider(REMOTE_API_DETECTOR_ID),
    'detector-local-pack': () => {
        unregisterProvider(LOCAL_PACK_DETECTOR_ID);
        resetOnnxProviderLoader();
    },
    'detector-onnx-pack': () => {
        unregisterProvider(ONNX_DETECTOR_ID);
        resetOnnxProviderLoader();
    },
};

export async function loadMod(modId: string): Promise<void> {
    const loader = MOD_LOADERS[modId];
    if (loader) await loader();
}

export function unloadMod(modId: string): void {
    const unloader = MOD_UNLOADERS[modId];
    if (unloader) unloader();
}

export function canLoadMod(modId: string): boolean {
    return modId in MOD_LOADERS;
}

export function canUnloadMod(modId: string): boolean {
    return modId in MOD_UNLOADERS;
}

export const DETECTOR_MOD_IDS = [
    'detector-heuristic-keywords',
    'detector-noise-patterns',
    'detector-remote-api',
    'detector-local-pack',
    'detector-onnx-pack',
] as const;

export { HEURISTIC_DETECTOR_ID };
