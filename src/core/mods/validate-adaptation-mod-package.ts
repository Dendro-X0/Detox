import { MOD_CATALOG } from '../../mods/mod-manifest';
import { parseAdaptationPackRules } from '../adaptation/adaptation-pack-types';
import type { ModPackagePayload } from './mod-package-types';

const ADAPTATION_MOD_ID_RE = /^adaptation-[a-z0-9-]+$/;

export function validateAdaptationModPackagePayload(payload: ModPackagePayload): string | null {
    if (payload.kind !== 'adaptation-pack') {
        return `Expected kind adaptation-pack, got ${payload.kind}`;
    }
    if (!ADAPTATION_MOD_ID_RE.test(payload.modId)) {
        return 'Adaptation pack modId must match adaptation-<slug>';
    }

    const catalogEntry = MOD_CATALOG.find((mod) => mod.id === payload.modId);
    if (catalogEntry && catalogEntry.kind !== 'adaptation-pack') {
        return `Kind mismatch: catalog has ${catalogEntry.kind}, package has adaptation-pack`;
    }

    const isCommunity = !catalogEntry;
    if (isCommunity) {
        if (!payload.adaptationMeta) {
            return 'Community adaptation packs require adaptationMeta';
        }
        if (!payload.description?.trim()) {
            return 'Community adaptation packs require description';
        }
        if (!payload.permissionsSummary?.trim()) {
            return 'Community adaptation packs require permissionsSummary';
        }
    }

    if (!payload.pack) {
        return 'Adaptation packages require inline pack rules (pack field)';
    }

    const rules = parseAdaptationPackRules(payload.pack);
    if (!rules) {
        return 'Invalid adaptation pack rules — check format, privacy, and packId';
    }
    if (rules.packId !== payload.modId) {
        return `pack.packId (${rules.packId}) must match modId (${payload.modId})`;
    }
    if (payload.version !== rules.version) {
        return 'manifest version must match pack.version';
    }

    if (payload.files && payload.files.length > 0) {
        return 'Single-file adaptation packages must not include files[] — embed pack inline';
    }

    return null;
}
