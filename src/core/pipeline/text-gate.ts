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
 * Language-specific packs (mods) may replace or extend this later.
 */
export function shouldClassifyText(text: string): boolean {
    let asciiLetterCount = 0;
    let nonLatinCount = 0;
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        const isAsciiLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        if (isAsciiLetter) asciiLetterCount += 1;
        const isBasicLatin = code <= 0x024f;
        if (!isBasicLatin) nonLatinCount += 1;
    }
    const minLetters = 12;
    if (asciiLetterCount < minLetters && nonLatinCount > 0) return false;
    const nonLatinRatio = text.length > 0 ? nonLatinCount / text.length : 0;
    return nonLatinRatio < 0.15;
}
