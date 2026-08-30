import { describe, expect, it } from 'vitest';
import {
    buildPageUnderstandReport,
    extractHeadingOutline,
} from '../../src/assist/page-outline';

function htmlToDocument(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
}

describe('page outline', () => {
    it('extracts h1–h6 headings in document order', () => {
        const doc = htmlToDocument(`
            <main>
                <h1>Main title</h1>
                <h2>Section A</h2>
                <h3>Subsection</h3>
                <h2>Section B</h2>
            </main>
        `);
        const outline = extractHeadingOutline(doc.body);
        expect(outline).toEqual([
            { level: 1, text: 'Main title' },
            { level: 2, text: 'Section A' },
            { level: 3, text: 'Subsection' },
            { level: 2, text: 'Section B' },
        ]);
    });

    it('skips empty or very short headings', () => {
        const doc = htmlToDocument('<main><h2>  </h2><h2>Overview</h2></main>');
        expect(extractHeadingOutline(doc.body)).toEqual([{ level: 2, text: 'Overview' }]);
    });

    it('builds report with key claims and limitations', () => {
        const mainText =
            'Scientists reported that the vaccine reduced hospitalizations by 40 percent in a large trial. ' +
            'Critics argue the study was too short. The company expects approval next year.';
        const report = buildPageUnderstandReport({
            url: 'https://example.com/article',
            title: 'Trial results',
            mainText,
            outline: [{ level: 1, text: 'Trial results' }],
            isDenseSite: false,
        });

        expect(report.url).toBe('https://example.com/article');
        expect(report.title).toBe('Trial results');
        expect(report.outline).toHaveLength(1);
        expect(report.keyClaims.length).toBeGreaterThan(0);
        expect(report.keyClaims.length).toBeLessThanOrEqual(5);
        expect(report.limitations).toContain('assist.understand.limitations.localHeuristics');
        expect(report.charCount).toBe(mainText.length);
        expect(report.id).toMatch(/^understand-/);
    });

    it('adds dense-site and no-headings limitations', () => {
        const report = buildPageUnderstandReport({
            url: 'https://x.com/post',
            title: 'Feed',
            mainText: 'short',
            outline: [],
            isDenseSite: true,
        });

        expect(report.limitations).toContain('assist.understand.limitations.denseSite');
        expect(report.limitations).toContain('assist.understand.limitations.noHeadings');
        expect(report.limitations).toContain('assist.understand.limitations.shortPage');
        expect(report.isDenseSite).toBe(true);
    });
});
