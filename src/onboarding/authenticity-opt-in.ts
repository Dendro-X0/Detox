import {
    DEFAULT_AUTHENTICITY_SETTINGS,
    type AuthenticitySettings,
} from '../mods/analyzers/authenticity/settings';
import type { AuthenticityAssistOptIn } from './types';

/** Wizard opt-in: search-only Wikipedia by default; LLM key optional for later T3. */
export function buildWizardAuthenticitySettings(
    optIn?: AuthenticityAssistOptIn
): AuthenticitySettings {
    if (!optIn?.enabled) {
        return DEFAULT_AUTHENTICITY_SETTINGS;
    }
    const llmApiKey = optIn.llmApiKey?.trim() ?? '';
    return {
        ...DEFAULT_AUTHENTICITY_SETTINGS,
        enabled: true,
        searchProvider: 'wikipedia',
        searchOnlyDefault: true,
        tierT3: false,
        llmApiKey,
        llmEndpoint: llmApiKey ? DEFAULT_AUTHENTICITY_SETTINGS.llmEndpoint : '',
    };
}
