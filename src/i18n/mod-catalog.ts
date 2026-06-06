import type { ModDescriptor } from '../mods/mod-manifest';
import type { TranslateFn } from './formatters';

export type LocalizedModFields = {
    readonly name: string;
    readonly description: string;
    readonly permissionsSummary: string;
    readonly sizeLabel: string;
};

export function getLocalizedModFields(mod: ModDescriptor, t: TranslateFn): LocalizedModFields {
    const base = `mods.${mod.id}`;
    return {
        name: t(`${base}.name`),
        description: t(`${base}.description`),
        permissionsSummary: t(`${base}.permissionsSummary`),
        sizeLabel: t(`${base}.sizeLabel`),
    };
}
