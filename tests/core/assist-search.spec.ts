import { describe, expect, it } from 'vitest';
import { parseAssistSettings } from '../../src/assist/assist-settings-store';
import {
    buildCompareSearchUrl,
    buildSearchUrl,
    buildWikipediaDefineUrl,
} from '../../src/assist/search-urls';
import { DEFAULT_ASSIST_SETTINGS } from '../../src/assist/types';

describe('assist search-urls', () => {
    it('builds duckduckgo search urls', () => {
        const url = buildSearchUrl('hello world', DEFAULT_ASSIST_SETTINGS);
        expect(url).toBe('https://duckduckgo.com/?q=hello%20world');
    });

    it('builds google and bing templates', () => {
        expect(
            buildSearchUrl('x', { ...DEFAULT_ASSIST_SETTINGS, searchEngineId: 'google' })
        ).toBe('https://www.google.com/search?q=x');
        expect(
            buildSearchUrl('x', { ...DEFAULT_ASSIST_SETTINGS, searchEngineId: 'bing' })
        ).toBe('https://www.bing.com/search?q=x');
    });

    it('uses custom template when it includes %s', () => {
        const url = buildSearchUrl('term', {
            ...DEFAULT_ASSIST_SETTINGS,
            searchEngineId: 'custom',
            customSearchUrlTemplate: 'https://example.test/q?s=%s',
        });
        expect(url).toBe('https://example.test/q?s=term');
    });

    it('falls back when custom template lacks %s', () => {
        const url = buildSearchUrl('term', {
            ...DEFAULT_ASSIST_SETTINGS,
            searchEngineId: 'custom',
            customSearchUrlTemplate: 'https://broken.example/search',
        });
        expect(url).toBe('https://duckduckgo.com/?q=term');
    });

    it('builds wikipedia define urls', () => {
        expect(buildWikipediaDefineUrl('neural network')).toContain(
            'wikipedia.org/wiki/Special:Search?search=neural%20network'
        );
    });

    it('builds compare search with quoted clips', () => {
        const url = buildCompareSearchUrl('alpha', 'beta', DEFAULT_ASSIST_SETTINGS);
        expect(url).toContain(encodeURIComponent('"alpha" "beta"'));
    });
});

describe('parseAssistSettings', () => {
    it('defaults when raw is empty', () => {
        expect(parseAssistSettings(undefined)).toEqual(DEFAULT_ASSIST_SETTINGS);
    });

    it('preserves toolbar off and engine choice', () => {
        expect(
            parseAssistSettings({
                selectionToolbarEnabled: false,
                searchEngineId: 'bing',
                customSearchUrlTemplate: 'https://x.test?q=%s',
            })
        ).toEqual({
            selectionToolbarEnabled: false,
            searchEngineId: 'bing',
            customSearchUrlTemplate: 'https://x.test?q=%s',
            dailyActionQuota: 100,
            pageUnderstandEnabled: false,
        });
    });

    it('enables page understand only when explicitly true', () => {
        expect(parseAssistSettings({ pageUnderstandEnabled: true }).pageUnderstandEnabled).toBe(true);
        expect(parseAssistSettings({ pageUnderstandEnabled: false }).pageUnderstandEnabled).toBe(false);
    });
});
