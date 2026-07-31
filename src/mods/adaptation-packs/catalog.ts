import type { ModDescriptor } from '../mod-manifest';
import type {
    AdaptationContentType,
    AdaptationPackCategory,
} from '../../core/adaptation/adaptation-pack-types';
import { getInstalledMods } from '../../core/mods/installed-mod-store';
import type { InstalledModRecord } from '../../core/mods/mod-package-types';

export type AdaptationPackDescriptor = ModDescriptor & {
    readonly kind: 'adaptation-pack';
    readonly packCategory: AdaptationPackCategory;
    readonly languages: readonly string[];
    readonly contexts: readonly string[];
    readonly contentTypes: readonly AdaptationContentType[];
};

export const ADAPTATION_PACK_CATALOG: readonly AdaptationPackDescriptor[] = [
    {
        id: 'adaptation-universal-social',
        kind: 'adaptation-pack',
        packCategory: 'context',
        name: 'Universal social feed',
        version: '1.0.0',
        description:
            'Language-agnostic social-feed cues: stronger engagement-hook and emoji signals, plus common sponsored DOM markers.',
        permissionsSummary: 'Local text + DOM hints only. No network. No storage of page content.',
        sizeLabel: '~2 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-universal-social',
        languages: ['*'],
        contexts: ['social-feed'],
        contentTypes: ['clickbait'],
    },
    {
        id: 'adaptation-en-promo',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'English — promotional',
        version: '1.0.0',
        description: 'Supplemental English promo phrases and ecommerce noise patterns.',
        permissionsSummary: 'Local pattern lists only. Active when page language is English.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-en-promo',
        languages: ['en'],
        contexts: ['ecommerce', 'social-feed'],
        contentTypes: ['promotional'],
    },
    {
        id: 'adaptation-en-clickbait',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'English — clickbait',
        version: '1.0.0',
        description: 'English engagement hooks and listicle-style bait phrasing for feeds and news.',
        permissionsSummary: 'Local pattern lists only. Active when page language is English.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-en-clickbait',
        languages: ['en'],
        contexts: ['social-feed', 'news'],
        contentTypes: ['clickbait'],
    },
    {
        id: 'adaptation-en-phishing',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'English — phishing',
        version: '1.0.0',
        description: 'English account-verification and urgency scam phrasing.',
        permissionsSummary: 'Local pattern lists only. Active when page language is English.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-en-phishing',
        languages: ['en'],
        contexts: ['social-feed', 'news', 'ecommerce'],
        contentTypes: ['phishing'],
    },
    {
        id: 'adaptation-en-toxic',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'English — toxic',
        version: '1.0.0',
        description: 'English insult and outrage phrasing for feeds and comment threads.',
        permissionsSummary: 'Local pattern lists only. Active when page language is English.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-en-toxic',
        languages: ['en'],
        contexts: ['social-feed', 'news'],
        contentTypes: ['toxic'],
    },
    {
        id: 'adaptation-de-promo',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'German — promotional',
        version: '1.0.0',
        description: 'German promo and discount phrasing for shops and feeds.',
        permissionsSummary: 'Local pattern lists only. Active when page language is German.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-de-promo',
        languages: ['de'],
        contexts: ['ecommerce', 'social-feed'],
        contentTypes: ['promotional'],
    },
    {
        id: 'adaptation-de-clickbait',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'German — clickbait',
        version: '1.0.0',
        description: 'German engagement-bait and sensational headline phrasing.',
        permissionsSummary: 'Local pattern lists only. Active when page language is German.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-de-clickbait',
        languages: ['de'],
        contexts: ['social-feed', 'news'],
        contentTypes: ['clickbait'],
    },
    {
        id: 'adaptation-de-phishing',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'German — phishing',
        version: '1.0.0',
        description: 'German account-verification and urgency scam phrasing.',
        permissionsSummary: 'Local pattern lists only. Active when page language is German.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-de-phishing',
        languages: ['de'],
        contexts: ['social-feed', 'news', 'ecommerce'],
        contentTypes: ['phishing'],
    },
    {
        id: 'adaptation-de-toxic',
        kind: 'adaptation-pack',
        packCategory: 'language',
        name: 'German — toxic',
        version: '1.0.0',
        description: 'German insult and outrage phrasing for feeds and comment threads.',
        permissionsSummary: 'Local pattern lists only. Active when page language is German.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: 'adaptation-de-toxic',
        languages: ['de'],
        contexts: ['social-feed', 'news'],
        contentTypes: ['toxic'],
    },
] as const;

export function isAdaptationPackId(modId: string): boolean {
    return modId.startsWith('adaptation-');
}

export function getAdaptationPackDescriptor(packId: string): AdaptationPackDescriptor | null {
    const bundled = ADAPTATION_PACK_CATALOG.find((pack) => pack.id === packId);
    if (bundled) return bundled;
    return communityDescriptorFromInstalled(packId);
}

function communityDescriptorFromInstalled(packId: string): AdaptationPackDescriptor | null {
    const record = getInstalledMods().find((entry) => entry.modId === packId);
    return record ? descriptorFromInstalledRecord(record) : null;
}

function descriptorFromInstalledRecord(record: InstalledModRecord): AdaptationPackDescriptor | null {
    if (record.kind !== 'adaptation-pack' || !record.adaptationMeta) return null;
    return {
        id: record.modId,
        kind: 'adaptation-pack',
        packCategory: record.adaptationMeta.packCategory,
        name: record.name,
        version: record.version,
        description: record.description ?? record.name,
        permissionsSummary:
            record.permissionsSummary ?? 'Local pattern lists only. No network. No upload.',
        sizeLabel: '~1 KB',
        profiles: ['core', 'full'],
        runtimeId: record.modId,
        languages: record.adaptationMeta.languages,
        contexts: record.adaptationMeta.contexts,
        contentTypes: record.adaptationMeta.contentTypes,
    };
}

/** Bundled + installed community adaptation packs (deduped by id). */
export function listAdaptationPackDescriptors(): readonly AdaptationPackDescriptor[] {
    const byId = new Map<string, AdaptationPackDescriptor>();
    for (const pack of ADAPTATION_PACK_CATALOG) {
        byId.set(pack.id, pack);
    }
    for (const record of getInstalledMods()) {
        if (record.kind !== 'adaptation-pack') continue;
        const descriptor = descriptorFromInstalledRecord(record);
        if (descriptor) byId.set(descriptor.id, descriptor);
    }
    return [...byId.values()];
}
