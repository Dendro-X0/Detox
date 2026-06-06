export function fnv1a32(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Lightweight gate to skip blocks unlikely to benefit from classification.
 * Short blocks with obvious promo/bait phrases still pass through.
 */
import { hasShortTextSignal } from '../rules/keyword-score';

const MIN_CLASSIFY_LENGTH = 20;
const MIN_SHORT_SIGNAL_LENGTH = 12;
const MIN_ASCII_LETTERS = 6;

export function shouldClassifyText(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < MIN_SHORT_SIGNAL_LENGTH) return false;

    if (trimmed.length < MIN_CLASSIFY_LENGTH && hasShortTextSignal(trimmed)) {
        return true;
    }

    if (trimmed.length < MIN_CLASSIFY_LENGTH) return false;

    let asciiLetterCount = 0;
    let nonLatinCount = 0;
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        const isAsciiLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        if (isAsciiLetter) asciiLetterCount += 1;
        const isBasicLatin = code <= 0x024f;
        if (!isBasicLatin) nonLatinCount += 1;
    }
    if (asciiLetterCount < MIN_ASCII_LETTERS && nonLatinCount > 0) return false;
    const nonLatinRatio = text.length > 0 ? nonLatinCount / text.length : 0;
    return nonLatinRatio < 0.15;
}
