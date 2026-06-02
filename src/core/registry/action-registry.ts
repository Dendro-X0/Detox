import type { EnforcementAction } from '../types/enforcement';
import { isActionModEnabled } from '../../mods/mod-manifest';
import {
    DEFAULT_ENFORCEMENT_ACTION_SETTINGS,
    type EnforcementActionSettings,
    type EnforcementActionStorageRecord,
} from '../types/enforcement';

const actions = new Map<string, EnforcementAction>();

let cachedSettings: EnforcementActionSettings = DEFAULT_ENFORCEMENT_ACTION_SETTINGS;

export function registerEnforcementAction(action: EnforcementAction): void {
    actions.set(action.id, action);
}

export function unregisterEnforcementAction(id: string): void {
    actions.delete(id);
}

export function getEnforcementAction(id: string): EnforcementAction | null {
    return actions.get(id) ?? null;
}

export function listEnforcementActions(): readonly EnforcementAction[] {
    return [...actions.values()].filter((action) => isActionModEnabled(action.id));
}

export function getEnforcementActionSettings(): EnforcementActionSettings {
    return cachedSettings;
}

export function getActiveEnforcementAction(): EnforcementAction {
    const activeId = isActionModEnabled(cachedSettings.activeActionId)
        ? cachedSettings.activeActionId
        : DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId;
    const action = actions.get(activeId);
    if (!action) {
        const fallback = actions.get(DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId);
        if (!fallback) {
            throw new Error('No enforcement actions registered');
        }
        return fallback;
    }
    return action;
}

export async function loadEnforcementActionSettings(): Promise<EnforcementActionSettings> {
    const result = await chrome.storage.local.get('enforcementAction');
    const record = result as EnforcementActionStorageRecord;
    const storedId = record.enforcementAction?.activeActionId;
    if (storedId && actions.has(storedId) && isActionModEnabled(storedId)) {
        cachedSettings = { activeActionId: storedId };
    } else {
        cachedSettings = DEFAULT_ENFORCEMENT_ACTION_SETTINGS;
    }
    return cachedSettings;
}

export function subscribeToEnforcementActionChanges(
    onChange: (settings: EnforcementActionSettings) => void
): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enforcementAction) {
            const next = changes.enforcementAction.newValue as EnforcementActionSettings | undefined;
            if (next?.activeActionId && actions.has(next.activeActionId) && isActionModEnabled(next.activeActionId)) {
                cachedSettings = next;
                onChange(next);
            }
        }
    });
}

export function installEnforcementActionLoader(): void {
    void loadEnforcementActionSettings();
    subscribeToEnforcementActionChanges(() => {
        // Reads via getEnforcementActionSettings() stay fresh.
    });
}
