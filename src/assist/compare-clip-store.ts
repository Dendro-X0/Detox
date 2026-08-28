/// <reference types="chrome" />
import { sessionGet, sessionRemove, sessionSet } from '../core/storage/extension-session';

const COMPARE_CLIP_KEY = 'assistCompareClip';
const MAX_CLIP_LENGTH = 2_000;

export async function loadCompareClip(): Promise<string | null> {
    const value = await sessionGet<string>(COMPARE_CLIP_KEY);
    return typeof value === 'string' && value.trim() ? value : null;
}

export async function saveCompareClip(text: string): Promise<string> {
    const clipped = text.trim().slice(0, MAX_CLIP_LENGTH);
    await sessionSet(COMPARE_CLIP_KEY, clipped);
    return clipped;
}

export async function clearCompareClip(): Promise<void> {
    await sessionRemove(COMPARE_CLIP_KEY);
}
