import { describe, expect, it } from 'vitest';
import { isSettingsTabId, parseSettingsTabFromHash, resolveSettingsTabId } from '../../src/dashboard/settings-tabs';

describe('settings tabs', () => {
    it('accepts preferences and legacy rules hash alias', () => {
        expect(isSettingsTabId('preferences')).toBe(true);
        expect(resolveSettingsTabId('rules')).toBe('preferences');
        expect(resolveSettingsTabId('preferences')).toBe('preferences');
    });

    it('maps legacy rules hash to preferences tab', () => {
        const original = window.location.hash;
        window.location.hash = '#rules';
        expect(parseSettingsTabFromHash()).toBe('preferences');
        window.location.hash = original;
    });
});
