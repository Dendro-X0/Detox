import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/locales/en.json' with { type: 'json' };
import { i18nMessage, localizeCompoundMessage, localizeMessage } from '../../src/i18n/localize';
import { translate } from '../../src/i18n/translate';

const t = (key: string, values?: Readonly<Record<string, string | number>>) => translate(en, key, values);

describe('i18n localize', () => {
    it('round-trips job message keys', () => {
        const raw = i18nMessage('authenticity.job.extractingClaims');
        expect(localizeMessage(raw, t)).toBe('Extracting claims…');
    });

    it('interpolates meta embedded in i18n messages', () => {
        const raw = i18nMessage('authenticity.notes.t1Ranking', { kept: 2, total: 5 });
        expect(localizeMessage(raw, t)).toContain('2');
        expect(localizeMessage(raw, t)).toContain('5');
    });

    it('localizes compound limitation strings', () => {
        const raw = [
            i18nMessage('authenticity.limitations.advisory'),
            i18nMessage('authenticity.limitations.searchOnly'),
        ].join('|');
        const text = localizeCompoundMessage(raw, t, { count: 3 });
        expect(text).toContain('Advisory only');
        expect(text).toContain('Search-only');
    });
});
