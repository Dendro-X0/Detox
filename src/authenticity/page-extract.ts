import { ENFORCEMENT_DATASET, enforcementAttrSelector } from '../core/enforcement/element-state';
import { resolveSiteHints } from '../core/scanner/hint-registry';
import { scanUniversal } from '../core/scanner/universal-scanner';
import { buildMainTextFromUnits, type PageContext } from '../mods/analyzers/authenticity/page-context';
import { detectSiteId, isDenseSite } from '../mods/analyzers/authenticity/scope-resolver';
import { buildPageUnderstandReport, extractHeadingOutline } from '../assist/page-outline';

const MAX_MAIN_CHARS = 12_000;

function buildMainTextFromDom(): string {
    const selectors = ['article', 'main', '[role="main"]', '#content', '.post-content', '.article-body'];
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        const text = element?.textContent?.trim();
        if (text && text.length >= 200) {
            return text.slice(0, MAX_MAIN_CHARS);
        }
    }
    return (document.body?.innerText ?? '').trim().slice(0, MAX_MAIN_CHARS);
}

export function extractPageContext(): PageContext {
    const hints = resolveSiteHints(location.hostname);
    const scanned = scanUniversal(document, hints ?? undefined);
    const units = scanned.map((unit) => ({
        id: unit.id,
        text: unit.text,
        preview: unit.text.slice(0, 120),
    }));

    const fromUnits = buildMainTextFromUnits(units, MAX_MAIN_CHARS);
    const mainText = fromUnits.length >= 200 ? fromUnits : buildMainTextFromDom();

    return {
        url: location.href,
        title: document.title,
        siteId: detectSiteId(location.hostname),
        units,
        mainText,
        isDenseSite: isDenseSite(location.hostname),
    };
}

export function getSelectionSnapshot(): { readonly text: string; readonly blockId?: string } {
    const selection = window.getSelection()?.toString()?.trim() ?? '';
    if (!selection) {
        return { text: '' };
    }

    const range = window.getSelection()?.getRangeAt(0);
    const node = range?.commonAncestorContainer;
    const element = node instanceof HTMLElement ? node : node?.parentElement;
    const block = element?.closest<HTMLElement>(enforcementAttrSelector('blockId'));
    const blockId = block?.dataset[ENFORCEMENT_DATASET.blockId];

    return { text: selection, blockId };
}

export function buildPageUnderstandFromDocument() {
    const context = extractPageContext();
    const roots = ['article', 'main', '[role="main"]', '#content', 'body'];
    let outlineRoot: ParentNode = document.body;
    for (const selector of roots) {
        const element = document.querySelector(selector);
        if (element) {
            outlineRoot = element;
            break;
        }
    }
    const outline = extractHeadingOutline(outlineRoot);
    return buildPageUnderstandReport({
        url: context.url,
        title: context.title,
        mainText: context.mainText,
        outline,
        isDenseSite: context.isDenseSite,
    });
}
