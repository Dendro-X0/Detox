import { registerEnforcementAction } from '../../core/registry/action-registry';
import { dimAction } from './dim/action';

let registered = false;

/** Register bundled enforcement action mods. Safe to call multiple times. */
export async function registerBuiltinActions(): Promise<void> {
    if (registered) return;

    registerEnforcementAction(dimAction);

    if (import.meta.env.VITE_BUILD_PROFILE === 'full') {
        const fullActions = await import('./register-full-actions');
        registerEnforcementAction(fullActions.blurAction);
        registerEnforcementAction(fullActions.collapseAction);
    }

    registered = true;
}

export { dimAction } from './dim/action';
