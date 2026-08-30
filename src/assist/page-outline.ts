import { extractClaimsFromText } from '../mods/analyzers/authenticity/t0-heuristics';
import type { Claim } from '../mods/analyzers/authenticity/types';

export type PageOutlineItem = {
    readonly level: 1 | 2 | 3 | 4 | 5 | 6;
    readonly text: string;
};

export type AssistPageUnderstandReport = {
    readonly id: string;
    readonly createdAt: number;
    readonly url: string;
    readonly title: string;
    readonly outline: readonly PageOutlineItem[];
    readonly keyClaims: readonly Claim[];
    readonly charCount: number;
    readonly isDenseSite: boolean;
    readonly limitations: readonly string[];
};

const MAX_OUTLINE_ITEMS = 40;
const MAX_CLAIMS = 5;
const MIN_HEADING_LENGTH = 3;

function newReportId(): string {
    return `understand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Extract h1–h6 outline from a DOM subtree (content script or tests). */
export function extractHeadingOutline(root: ParentNode): readonly PageOutlineItem[] {
    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const outline: PageOutlineItem[] = [];

    for (const node of headings) {
        if (outline.length >= MAX_OUTLINE_ITEMS) break;
        const tag = node.tagName.toLowerCase();
        const level = Number(tag.slice(1));
        if (level < 1 || level > 6) continue;
        const text = node.textContent?.trim().replace(/\s+/g, ' ') ?? '';
        if (text.length < MIN_HEADING_LENGTH) continue;
        outline.push({ level: level as PageOutlineItem['level'], text: text.slice(0, 200) });
    }

    return outline;
}

export function buildPageUnderstandReport(input: {
    readonly url: string;
    readonly title: string;
    readonly mainText: string;
    readonly outline: readonly PageOutlineItem[];
    readonly isDenseSite: boolean;
}): AssistPageUnderstandReport {
    const mainText = input.mainText.trim();
    const keyClaims = extractClaimsFromText(mainText, MAX_CLAIMS);
    const limitations: string[] = ['assist.understand.limitations.localHeuristics'];

    if (input.isDenseSite) {
        limitations.push('assist.understand.limitations.denseSite');
    }
    if (input.outline.length === 0) {
        limitations.push('assist.understand.limitations.noHeadings');
    }
    if (mainText.length < 200) {
        limitations.push('assist.understand.limitations.shortPage');
    }

    return {
        id: newReportId(),
        createdAt: Date.now(),
        url: input.url,
        title: input.title,
        outline: input.outline,
        keyClaims,
        charCount: mainText.length,
        isDenseSite: input.isDenseSite,
        limitations,
    };
}
