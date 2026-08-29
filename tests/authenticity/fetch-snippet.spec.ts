import { describe, expect, it } from 'vitest';
import { extractReadableTextFromHtml } from '../../src/mods/analyzers/authenticity/fetch-snippet';
import { snippetOverlapsFetchedText } from '../../src/mods/analyzers/authenticity/snippet-verify';

describe('extractReadableTextFromHtml', () => {
    it('prefers title, meta description, and article body', () => {
        const html = `<!DOCTYPE html><html><head>
            <title>Annual Report Summary</title>
            <meta name="description" content="Official growth figures published today." />
        </head><body><nav>Skip nav</nav>
            <article><p>Official data shows ninety percent growth according to regulators.</p></article>
        </body></html>`;
        const text = extractReadableTextFromHtml(html, 2000);
        expect(text).toContain('Annual Report Summary');
        expect(text).toContain('Official growth figures');
        expect(text).toContain('ninety percent growth');
    });
});

describe('snippetOverlapsFetchedText', () => {
    it('accepts short snippets without strict overlap', () => {
        expect(snippetOverlapsFetchedText('any page text', 'short')).toBe(true);
    });

    it('requires probe overlap for long snippets', () => {
        const snippet =
            'Official data shows ninety percent growth according to the annual report published today in Washington.';
        const page =
            'Background intro. Official data shows ninety percent growth according to the annual report published today in Washington. Footer text.';
        expect(snippetOverlapsFetchedText(page, snippet)).toBe(true);
    });

    it('accepts partial word overlap for medium snippets', () => {
        const snippet = 'Official data shows ninety percent growth according to regulators';
        const page = 'Intro. Official data shows ninety percent growth in the filing. Outro.';
        expect(snippetOverlapsFetchedText(page, snippet)).toBe(true);
    });

    it('rejects when probe is absent from fetched text', () => {
        const snippet =
            'Completely different claim about lunar mining regulations and export controls from multiple agencies.';
        expect(snippetOverlapsFetchedText('Unrelated article about gardening and seasonal planting tips.', snippet)).toBe(
            false
        );
    });
});
