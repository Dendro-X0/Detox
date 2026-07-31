import { loadAdaptationPackRules } from '../../mods/adaptation-packs/load-pack';
import {
    detectPageContexts,
    packAppliesToPageContext,
    type AdaptationPageContext,
} from './page-context';
import {
    emptyMergedAdaptationRules,
    type AdaptationPackRules,
    type MergedAdaptationRules,
} from './adaptation-pack-types';

const activeRulesByPackId = new Map<string, AdaptationPackRules>();
let cachedPageLanguage: string | null = null;
let cachedPageContexts: readonly AdaptationPageContext[] | null = null;

export function setAdaptationPageLanguage(language: string | null): void {
    cachedPageLanguage = language?.split('-')[0]?.toLowerCase() ?? null;
}

export function getAdaptationPageLanguage(): string | null {
    return cachedPageLanguage;
}

export function setAdaptationPageContext(contexts: readonly AdaptationPageContext[] | null): void {
    cachedPageContexts = contexts;
}

export function setAdaptationPageFromUrl(pageUrl: string): void {
    cachedPageContexts = detectPageContexts(pageUrl);
}

export function getAdaptationPageContext(): readonly AdaptationPageContext[] | null {
    return cachedPageContexts;
}

export async function activateAdaptationPack(packId: string): Promise<boolean> {
    const rules = await loadAdaptationPackRules(packId);
    if (!rules) return false;
    activeRulesByPackId.set(packId, rules);
    return true;
}

export function deactivateAdaptationPack(packId: string): void {
    activeRulesByPackId.delete(packId);
}

export function clearAdaptationPacks(): void {
    activeRulesByPackId.clear();
}

function packAppliesToPageLanguage(rules: AdaptationPackRules, pageLanguage: string | null): boolean {
    const langs = rules.languages;
    if (!langs || langs.length === 0) return true;
    if (langs.includes('*')) return true;
    if (!pageLanguage) return false;
    return langs.some((lang) => lang.toLowerCase() === pageLanguage);
}

function mergeNoisePatterns(
    target: MergedAdaptationRules['noisePatterns'],
    source: AdaptationPackRules['noisePatterns']
): void {
    if (!source) return;
    for (const category of Object.keys(source) as Array<keyof NonNullable<typeof source>>) {
        const patterns = source[category];
        if (!patterns?.length) continue;
        const existing = target[category] ?? [];
        target[category] = [...new Set([...existing, ...patterns])];
    }
}

/** In-memory merge of enabled adaptation packs for the current page language and context. */
export function getMergedAdaptationRules(
    pageLanguage?: string | null,
    pageContexts?: readonly AdaptationPageContext[] | null
): MergedAdaptationRules {
    const lang = pageLanguage ?? cachedPageLanguage;
    const contexts = pageContexts ?? cachedPageContexts;
    const merged = emptyMergedAdaptationRules();
    const keywordSet = new Set<string>();
    const markerSet = new Set<string>();
    const activePackIds: string[] = [];

    for (const [packId, rules] of activeRulesByPackId) {
        if (!packAppliesToPageLanguage(rules, lang)) continue;
        if (!packAppliesToPageContext(rules.contexts, contexts)) continue;
        activePackIds.push(packId);

        for (const keyword of rules.supplementalKeywords ?? []) {
            keywordSet.add(keyword);
        }
        mergeNoisePatterns(merged.noisePatterns, rules.noisePatterns);
        for (const marker of rules.domPromotedMarkers ?? []) {
            markerSet.add(marker);
        }
        for (const [signal, boost] of Object.entries(rules.behaviorWeightBoosts ?? {})) {
            const key = signal as keyof typeof merged.behaviorWeightBoosts;
            merged.behaviorWeightBoosts[key] = (merged.behaviorWeightBoosts[key] ?? 0) + (boost ?? 0);
        }
    }

    return {
        supplementalKeywords: [...keywordSet],
        noisePatterns: merged.noisePatterns,
        behaviorWeightBoosts: merged.behaviorWeightBoosts,
        domPromotedMarkers: [...markerSet],
        activePackIds,
    };
}
