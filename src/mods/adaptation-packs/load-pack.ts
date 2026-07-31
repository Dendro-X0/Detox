import { getModAsset } from '../../core/mods/mod-asset-store';
import {
    parseAdaptationPackRules,
    type AdaptationPackRules,
} from '../../core/adaptation/adaptation-pack-types';
import deClickbait from './bundled/de-clickbait.pack.json';
import dePhishing from './bundled/de-phishing.pack.json';
import dePromo from './bundled/de-promo.pack.json';
import deToxic from './bundled/de-toxic.pack.json';
import enClickbait from './bundled/en-clickbait.pack.json';
import enPhishing from './bundled/en-phishing.pack.json';
import enPromo from './bundled/en-promo.pack.json';
import enToxic from './bundled/en-toxic.pack.json';
import universalSocial from './bundled/universal-social.pack.json';

const BUNDLED_RULES: Record<string, AdaptationPackRules> = {
    'adaptation-en-promo': enPromo as AdaptationPackRules,
    'adaptation-en-clickbait': enClickbait as AdaptationPackRules,
    'adaptation-en-phishing': enPhishing as AdaptationPackRules,
    'adaptation-en-toxic': enToxic as AdaptationPackRules,
    'adaptation-de-promo': dePromo as AdaptationPackRules,
    'adaptation-de-clickbait': deClickbait as AdaptationPackRules,
    'adaptation-de-phishing': dePhishing as AdaptationPackRules,
    'adaptation-de-toxic': deToxic as AdaptationPackRules,
    'adaptation-universal-social': universalSocial as AdaptationPackRules,
};

const PACK_ASSET_PATH = 'pack.json';

export async function loadAdaptationPackRules(packId: string): Promise<AdaptationPackRules | null> {
    const bundled = BUNDLED_RULES[packId];
    if (bundled) return bundled;

    const asset = await getModAsset(packId, PACK_ASSET_PATH);
    if (!asset) return null;

    const text = new TextDecoder().decode(asset);
    try {
        return parseAdaptationPackRules(JSON.parse(text) as unknown);
    } catch {
        return null;
    }
}
