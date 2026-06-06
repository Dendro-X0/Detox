import type { TranslateFn } from './formatters';

export const I18N_MESSAGE_PREFIX = 'i18n:' as const;

/** Store in job state / reports; UI translates with the active locale bundle. */
export function i18nMessage(key: string, meta?: Readonly<Record<string, string | number>>): string {
    if (!meta || Object.keys(meta).length === 0) {
        return `${I18N_MESSAGE_PREFIX}${key}`;
    }
    const metaParts = Object.entries(meta).map(([name, value]) => `${name}=${value}`);
    return `${I18N_MESSAGE_PREFIX}${key}|${metaParts.join('|')}`;
}

function parseI18nMessage(message: string): { readonly key: string; readonly meta: Record<string, string | number> } | null {
    if (!message.startsWith(I18N_MESSAGE_PREFIX)) return null;
    const body = message.slice(I18N_MESSAGE_PREFIX.length);
    const [key, ...metaParts] = body.split('|');
    if (!key) return null;
    const meta: Record<string, string | number> = {};
    for (const part of metaParts) {
        const eq = part.indexOf('=');
        if (eq <= 0) continue;
        const name = part.slice(0, eq);
        const raw = part.slice(eq + 1);
        const asNumber = Number(raw);
        meta[name] = Number.isFinite(asNumber) && raw.trim() !== '' ? asNumber : raw;
    }
    return { key, meta };
}

export function localizeMessage(
    message: string,
    t: TranslateFn,
    extra?: Readonly<Record<string, string | number>>
): string {
    const parsed = parseI18nMessage(message);
    if (!parsed) return message;
    return t(parsed.key, { ...parsed.meta, ...extra });
}

/** Limitations and multi-part footers joined with `|`. */
export function localizeCompoundMessage(
    message: string,
    t: TranslateFn,
    extra?: Readonly<Record<string, string | number>>
): string {
    if (!message.includes(I18N_MESSAGE_PREFIX)) return localizeMessage(message, t, extra);
    return message
        .split('|')
        .map((part) => {
            const trimmed = part.trim();
            if (!trimmed.startsWith(I18N_MESSAGE_PREFIX)) return trimmed;
            return localizeMessage(trimmed, t, extra);
        })
        .filter((part) => part.length > 0)
        .join(' ');
}

export function localizeOptionalMessage(
    message: string | undefined,
    t: TranslateFn,
    extra?: Readonly<Record<string, string | number>>
): string | undefined {
    if (!message) return message;
    return localizeMessage(message, t, extra);
}
