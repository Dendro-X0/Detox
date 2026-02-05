/**
 * Language Pack Manager for Detox AI
 *
 * Manages model pack selection based on page language detection.
 * Falls back to multilingual models when language-specific packs unavailable.
 */

import type { ModelPack } from '../../types/model-pack';

/** Available model packs registry */
interface PackRegistry {
    readonly packs: readonly ModelPack[];
    readonly multilingualPack: ModelPack | null;
}

/** Language detection result */
interface LanguageDetection {
    readonly primary: string;
    readonly confidence: number;
    readonly alternatives: readonly string[];
}

/** Default multilingual pack ID */
const MULTILINGUAL_WILDCARD = '*';

/** Cache for pack registry */
let packRegistry: PackRegistry | null = null;

/**
 * Scans available model packs from the public directory.
 * This should be called once at extension startup.
 */
export async function scanModelPacks(): Promise<PackRegistry> {
    if (packRegistry !== null) return packRegistry;

    const packs: ModelPack[] = [];
    let multilingualPack: ModelPack | null = null;

    // Scan model-packs directory
    // In production, this would be bundled; for dev we scan dynamically
    const packUrls = [
        chrome.runtime.getURL('model-packs/toxicity/modelpack.json'),
        chrome.runtime.getURL('model-packs/toxicity-multi-xlm-r/modelpack.json'),
    ];

    for (const url of packUrls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const pack = await response.json() as ModelPack;
                packs.push(pack);

                // Identify multilingual pack
                if (pack.languages.includes(MULTILINGUAL_WILDCARD)) {
                    multilingualPack = pack;
                }
            }
        } catch (error) {
            console.warn(`[Detox] Failed to load model pack from ${url}:`, error);
        }
    }

    packRegistry = { packs, multilingualPack };
    console.log('[Detox] Model pack registry loaded:', packs.length, 'packs');
    return packRegistry;
}

/**
 * Detects the primary language of the current page.
 * Uses HTML lang attribute, meta tags, and text sampling.
 */
export function detectPageLanguage(): LanguageDetection {
    // 1. Check HTML lang attribute (most reliable)
    const htmlLang = document.documentElement.lang?.toLowerCase();
    if (htmlLang) {
        const primary = htmlLang.split('-')[0]; // Extract base language (e.g., 'en' from 'en-US')
        return {
            primary,
            confidence: 0.9,
            alternatives: [htmlLang],
        };
    }

    // 2. Check meta tags
    const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content')?.toLowerCase() ||
                     document.querySelector('meta[name="language"]')?.getAttribute('content')?.toLowerCase();
    if (metaLang) {
        const primary = metaLang.split(',')[0].trim().split('-')[0];
        return {
            primary,
            confidence: 0.8,
            alternatives: metaLang.split(',').map(s => s.trim()),
        };
    }

    // 3. Sample text content for language detection
    const sampleText = extractTextSample();
    if (sampleText.length > 50) {
        const detected = heuristicLanguageDetect(sampleText);
        return {
            primary: detected,
            confidence: 0.6,
            alternatives: [],
        };
    }

    // Default to English
    return {
        primary: 'en',
        confidence: 0.3,
        alternatives: ['en'],
    };
}

/**
 * Extracts a representative text sample from the page.
 */
function extractTextSample(): string {
    const selectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '#content',
        'body',
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent?.slice(0, 1000) ?? '';
            if (text.length > 100) return text;
        }
    }

    return document.body?.textContent?.slice(0, 1000) ?? '';
}

/**
 * Simple heuristic language detection based on character patterns.
 * Returns ISO 639-1 language code.
 */
function heuristicLanguageDetect(text: string): string {
    // Character range patterns for common languages
    const patterns: Record<string, RegExp> = {
        zh: /[\u4e00-\u9fff]/,           // Chinese
        ja: /[\u3040-\u309f\u30a0-\u30ff]/, // Japanese hiragana/katakana
        ko: /[\uac00-\ud7af]/,           // Korean
        ar: /[\u0600-\u06ff]/,           // Arabic
        he: /[\u0590-\u05ff]/,           // Hebrew
        ru: /[\u0400-\u04ff]/,           // Cyrillic
        th: /[\u0e00-\u0e7f]/,           // Thai
        hi: /[\u0900-\u097f]/,           // Devanagari (Hindi)
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
        if (pattern.test(text)) {
            // Count matches to estimate confidence
            const matches = (text.match(pattern) || []).length;
            if (matches > 10) return lang;
        }
    }

    // Default to English for Latin script
    return 'en';
}

/**
 * Selects the best model pack for the given language.
 * Falls back to multilingual pack if no specific pack available.
 */
export function selectModelPack(
    language: string,
    registry: PackRegistry
): ModelPack | null {
    const normalizedLang = language.toLowerCase().split('-')[0];

    // 1. Look for exact language match
    for (const pack of registry.packs) {
        if (pack.languages.includes(normalizedLang)) {
            console.log(`[Detox] Selected language-specific pack: ${pack.id} for ${normalizedLang}`);
            return pack;
        }
    }

    // 2. Fall back to multilingual pack
    if (registry.multilingualPack) {
        console.log(`[Detox] Using multilingual pack: ${registry.multilingualPack.id} for ${normalizedLang}`);
        return registry.multilingualPack;
    }

    // 3. Return any available pack as last resort
    if (registry.packs.length > 0) {
        console.warn(`[Detox] No suitable pack for ${normalizedLang}, using: ${registry.packs[0].id}`);
        return registry.packs[0];
    }

    return null;
}

/**
 * Gets the preferred model pack for the current page.
 * Combines language detection and pack selection.
 */
export async function getPreferredModelPack(): Promise<ModelPack | null> {
    const registry = await scanModelPacks();
    const detection = detectPageLanguage();
    return selectModelPack(detection.primary, registry);
}

/**
 * Clears the pack registry cache (for testing).
 */
export function clearPackRegistry(): void {
    packRegistry = null;
}
