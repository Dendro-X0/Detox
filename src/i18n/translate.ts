import type { LocaleBundle } from './types';

type InterpolationValues = Readonly<Record<string, string | number>>;

function readPath(source: unknown, path: readonly string[]): unknown {
    let current: unknown = source;
    for (const segment of path) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

function interpolate(template: string, values?: InterpolationValues): string {
    if (!values) return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
        const value = values[key];
        return value === undefined ? `{{${key}}}` : String(value);
    });
}

/** Resolve a dot-path key against a locale bundle (e.g. `wizard.welcome.heading`). */
export function translate(
    bundle: LocaleBundle,
    key: string,
    values?: InterpolationValues
): string {
    const segments = key.split('.');
    const resolved = readPath(bundle, segments);
    if (typeof resolved !== 'string') {
        return key;
    }
    return interpolate(resolved, values);
}
