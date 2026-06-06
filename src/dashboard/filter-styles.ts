import type { EnforcementActionId } from '../core/types/enforcement';
import { getBuildProfile } from '../build-profile';
import { isModEnabled, isModUnlocked } from '../core/mods/mod-enablement-store';

const FILTER_STYLE_OPTIONS: readonly { readonly id: EnforcementActionId; readonly fullOnly?: boolean }[] = [
    { id: 'dim' },
    { id: 'blur', fullOnly: true },
    { id: 'collapse', fullOnly: true },
];

function actionModId(actionId: EnforcementActionId): string {
    return `action-${actionId}`;
}

export function getVisibleFilterStyles(
    t: (key: string) => string
): readonly { readonly id: EnforcementActionId; readonly label: string }[] {
    const profile = getBuildProfile();
    return FILTER_STYLE_OPTIONS.filter(
        (option) => isModUnlocked(actionModId(option.id), profile) && isModEnabled(actionModId(option.id))
    ).map((option) => ({
        id: option.id,
        label: t(`wizard.filterStyles.${option.id}`),
    }));
}
