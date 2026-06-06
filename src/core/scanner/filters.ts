const SKIP_TAGS = new Set([
    'script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'pre', 'code',
    'nav', 'header', 'footer', 'aside', 'button', 'input', 'textarea', 'select', 'label',
]);

const CHROME_ROLES = new Set(['navigation', 'banner', 'complementary', 'contentinfo', 'menubar']);

const CHROME_CLASS_PATTERNS = [
    'navbar', 'navigation', 'sidebar', 'breadcrumb', 'pagination', 'toolbar',
    'topbar', 'footer', 'header', 'dropdown', 'popover', 'tooltip',
];

export const MIN_UNIT_CHARS = 40;
export const MIN_UNIT_WORDS = 8;

export function normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function wordCount(text: string): number {
    return normalizeText(text).split(/\s+/).filter((word) => word.length > 0).length;
}

export function hasSubstantiveText(text: string): boolean {
    const normalized = normalizeText(text);
    if (normalized.length < MIN_UNIT_CHARS) return false;
    if (wordCount(normalized) < MIN_UNIT_WORDS) return false;
    return true;
}

export function isChromeElement(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return true;

    const role = element.getAttribute('role')?.toLowerCase();
    if (role && CHROME_ROLES.has(role)) return true;

    if (element.closest('nav, header, footer, aside, button, [role="navigation"], [role="banner"], [role="complementary"], [role="contentinfo"]')) {
        return true;
    }

    if (element.closest('pre, code, .code, .highlight')) return true;

    const classAndId = `${element.className} ${element.id}`.toLowerCase();
    if (CHROME_CLASS_PATTERNS.some((pattern) => classAndId.includes(pattern))) return true;

    return false;
}
