import { DEFAULT_ASSIST_SETTINGS, type AssistSettings } from '../assist/types';
import {
    DEFAULT_AUTHENTICITY_SETTINGS,
    type AuthenticitySettings,
} from '../mods/analyzers/authenticity/settings';
import type { AuthenticityAssistOptIn } from './types';

/** Wizard opt-in: toolbar off unless user enables Assist on the wizard step. */
export function buildWizardAssistSettings(optIn?: AuthenticityAssistOptIn): AssistSettings {
    if (!optIn?.enabled) {
        return {
            ...DEFAULT_ASSIST_SETTINGS,
            selectionToolbarEnabled: false,
        };
    }
    return DEFAULT_ASSIST_SETTINGS;
}

/** Wizard Verify sub-opt-in: search-only Wikipedia by default; LLM key optional for later T3. */
export function buildWizardAuthenticitySettings(
    optIn?: AuthenticityAssistOptIn
): AuthenticitySettings {
    if (!optIn?.enabled || !optIn.verifyEnabled) {
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
