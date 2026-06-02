import type { Verdict } from '../types/verdict';
import type { EnforcementResult } from '../../site-adapters/adapter-interface';

export type EnforcementContext = {
    readonly blockId?: string;
    readonly maxTextLength: number;
    readonly maxAreaPx: number;
};

export const DEFAULT_ENFORCEMENT_CONTEXT: EnforcementContext = {
    maxTextLength: 800,
    maxAreaPx: 1_000_000,
};

/**
 * Pluggable visual treatment for matched content blocks.
 */
export interface EnforcementAction {
    readonly id: string;
    readonly displayName: string;
    apply(element: HTMLElement, verdict: Verdict, context: EnforcementContext): EnforcementResult;
    reveal(element: HTMLElement): void;
}

export type EnforcementActionId = 'blur' | 'dim' | 'collapse';

export type EnforcementActionSettings = {
    readonly activeActionId: EnforcementActionId;
};

export const DEFAULT_ENFORCEMENT_ACTION_SETTINGS: EnforcementActionSettings = {
    activeActionId: 'dim',
};

export type EnforcementActionStorageRecord = {
    readonly enforcementAction?: EnforcementActionSettings;
};
