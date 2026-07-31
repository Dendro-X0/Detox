/**
 * Shared validation + helpers for adaptation pack authoring (Node scripts).
 */

export const ADAPTATION_PACK_FORMAT = 'signallens-adaptation/1';
export const MOD_PACKAGE_FORMAT = 'signallens-mod/1';

const NOISE_CATEGORIES = new Set(['promo', 'outrage', 'engagement-bait']);
const BEHAVIOR_SIGNALS = new Set([
    'caps-shouting',
    'punctuation-burst',
    'emoji-spam',
    'url-heavy',
    'repetition',
    'engagement-hook',
    'listicle-structure',
    'symbol-noise',
]);
const PACK_CATEGORIES = new Set(['language', 'context', 'site']);
const CONTENT_TYPES = new Set(['promotional', 'clickbait', 'phishing', 'toxic']);
const MOD_ID_RE = /^adaptation-[a-z0-9-]+$/;

export function validatePackJson(raw, { modId } = {}) {
    const errors = [];
    if (typeof raw !== 'object' || raw === null) {
        return ['pack.json must be a JSON object'];
    }

    if (raw.format !== ADAPTATION_PACK_FORMAT) {
        errors.push(`format must be "${ADAPTATION_PACK_FORMAT}"`);
    }
    if (typeof raw.packId !== 'string' || !MOD_ID_RE.test(raw.packId)) {
        errors.push('packId must match adaptation-<slug> (lowercase letters, digits, hyphens)');
    }
    if (modId && raw.packId !== modId) {
        errors.push(`packId "${raw.packId}" must match mod.meta.json modId "${modId}"`);
    }
    if (typeof raw.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(raw.version)) {
        errors.push('version must be semver like 1.0.0');
    }

    const privacy = raw.privacy;
    if (!privacy || typeof privacy !== 'object') {
        errors.push('privacy object is required');
    } else {
        for (const key of ['networkAccess', 'persistsPageContent', 'telemetry']) {
            if (privacy[key] !== false) {
                errors.push(`privacy.${key} must be false (local-only packs)`);
            }
        }
    }

    if (raw.languages !== undefined) {
        if (!Array.isArray(raw.languages) || raw.languages.length === 0) {
            errors.push('languages must be a non-empty array (use ["*"] for all languages)');
        } else {
            for (const lang of raw.languages) {
                if (typeof lang !== 'string' || lang.length === 0) {
                    errors.push('languages entries must be non-empty strings');
                }
            }
        }
    }

    if (raw.contexts !== undefined) {
        if (!Array.isArray(raw.contexts) || raw.contexts.length === 0) {
            errors.push('contexts must be a non-empty array');
        }
    }

    if (raw.contentTypes !== undefined) {
        if (!Array.isArray(raw.contentTypes) || raw.contentTypes.length === 0) {
            errors.push('contentTypes must be a non-empty array');
        } else {
            for (const type of raw.contentTypes) {
                if (!CONTENT_TYPES.has(type)) {
                    errors.push(`contentTypes entry "${type}" is invalid — use promotional, clickbait, phishing, or toxic`);
                    break;
                }
            }
        }
    }

    validateStringArray(raw.supplementalKeywords, 'supplementalKeywords', errors, { minLen: 2, maxItems: 500 });
    validateNoisePatterns(raw.noisePatterns, errors);
    validateBehaviorBoosts(raw.behaviorWeightBoosts, errors);
    validateStringArray(raw.domPromotedMarkers, 'domPromotedMarkers', errors, { minLen: 2, maxItems: 64 });

    const hasRules =
        (raw.supplementalKeywords?.length ?? 0) > 0 ||
        hasNoisePatterns(raw.noisePatterns) ||
        Object.keys(raw.behaviorWeightBoosts ?? {}).length > 0 ||
        (raw.domPromotedMarkers?.length ?? 0) > 0;
    if (!hasRules) {
        errors.push('pack must define at least one rule (keywords, noisePatterns, behaviorWeightBoosts, or domPromotedMarkers)');
    }

    return errors;
}

function hasNoisePatterns(noisePatterns) {
    if (!noisePatterns || typeof noisePatterns !== 'object') return false;
    return Object.values(noisePatterns).some((list) => Array.isArray(list) && list.length > 0);
}

function validateStringArray(value, field, errors, { minLen, maxItems }) {
    if (value === undefined) return;
    if (!Array.isArray(value)) {
        errors.push(`${field} must be an array`);
        return;
    }
    if (value.length > maxItems) {
        errors.push(`${field} must have at most ${maxItems} entries`);
    }
    for (const item of value) {
        if (typeof item !== 'string' || item.trim().length < minLen) {
            errors.push(`${field} entries must be strings with at least ${minLen} characters`);
            break;
        }
    }
}

function validateNoisePatterns(noisePatterns, errors) {
    if (noisePatterns === undefined) return;
    if (typeof noisePatterns !== 'object' || noisePatterns === null || Array.isArray(noisePatterns)) {
        errors.push('noisePatterns must be an object');
        return;
    }
    for (const [key, patterns] of Object.entries(noisePatterns)) {
        if (!NOISE_CATEGORIES.has(key)) {
            errors.push(`noisePatterns.${key} is not a valid category`);
        }
        if (!Array.isArray(patterns)) {
            errors.push(`noisePatterns.${key} must be an array`);
        }
    }
}

function validateBehaviorBoosts(boosts, errors) {
    if (boosts === undefined) return;
    if (typeof boosts !== 'object' || boosts === null || Array.isArray(boosts)) {
        errors.push('behaviorWeightBoosts must be an object');
        return;
    }
    for (const [key, value] of Object.entries(boosts)) {
        if (!BEHAVIOR_SIGNALS.has(key)) {
            errors.push(`behaviorWeightBoosts.${key} is not a valid signal id`);
        }
        if (typeof value !== 'number' || value <= 0 || value > 0.15) {
            errors.push(`behaviorWeightBoosts.${key} must be a number in (0, 0.15]`);
        }
    }
}

export function validateModMeta(raw) {
    const errors = [];
    if (typeof raw !== 'object' || raw === null) {
        return ['mod.meta.json must be a JSON object'];
    }
    if (typeof raw.modId !== 'string' || !MOD_ID_RE.test(raw.modId)) {
        errors.push('modId must match adaptation-<slug>');
    }
    if (typeof raw.name !== 'string' || raw.name.trim().length < 3) {
        errors.push('name is required (min 3 characters)');
    }
    if (typeof raw.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(raw.version)) {
        errors.push('version must be semver like 1.0.0');
    }
    if (typeof raw.description !== 'string' || raw.description.trim().length < 12) {
        errors.push('description is required (min 12 characters)');
    }
    if (typeof raw.permissionsSummary !== 'string' || raw.permissionsSummary.trim().length < 12) {
        errors.push('permissionsSummary is required (min 12 characters)');
    }
    if (!PACK_CATEGORIES.has(raw.packCategory)) {
        errors.push('packCategory must be language, context, or site');
    }
    if (!Array.isArray(raw.languages) || raw.languages.length === 0) {
        errors.push('languages must be a non-empty array');
    }
    if (!Array.isArray(raw.contexts) || raw.contexts.length === 0) {
        errors.push('contexts must be a non-empty array');
    }
    if (!Array.isArray(raw.contentTypes) || raw.contentTypes.length === 0) {
        errors.push('contentTypes must be a non-empty array (promotional, clickbait, phishing, toxic)');
    } else {
        for (const type of raw.contentTypes) {
            if (!CONTENT_TYPES.has(type)) {
                errors.push(`contentTypes entry "${type}" is invalid`);
                break;
            }
        }
    }
    return errors;
}

export function buildModPayload(meta, pack) {
    return {
        format: MOD_PACKAGE_FORMAT,
        modId: meta.modId,
        version: meta.version,
        name: meta.name,
        kind: 'adaptation-pack',
        description: meta.description,
        permissionsSummary: meta.permissionsSummary,
        pack,
        adaptationMeta: {
            packCategory: meta.packCategory,
            languages: meta.languages,
            contexts: meta.contexts,
            contentTypes: meta.contentTypes,
        },
    };
}
