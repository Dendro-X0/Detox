import { describe, expect, it } from 'vitest';
import {
    getPresetById,
    isPresetEnabled,
    setPresetEnabled,
    SITE_WHITELIST_PRESETS,
} from '../../src/core/rules/site-whitelist-presets';

describe('site whitelist presets', () => {
    it('enables and disables preset domain bundles', () => {
        const preset = getPresetById('google-workspace');
        expect(isPresetEnabled(preset, [])).toBe(false);

        const enabled = setPresetEnabled(preset, [], true);
        expect(isPresetEnabled(preset, enabled)).toBe(true);
        expect(enabled).toContain('docs.google.com');
        expect(enabled).toContain('mail.google.com');

        const disabled = setPresetEnabled(preset, enabled, false);
        expect(isPresetEnabled(preset, disabled)).toBe(false);
        expect(disabled).not.toContain('docs.google.com');
    });

    it('preserves custom domains when toggling presets', () => {
        const preset = getPresetById('music-lyrics');
        const withCustom = setPresetEnabled(preset, ['intranet.example.com'], true);
        expect(withCustom).toContain('intranet.example.com');
        expect(withCustom).toContain('open.spotify.com');

        const afterDisable = setPresetEnabled(preset, withCustom, false);
        expect(afterDisable).toEqual(['intranet.example.com']);
    });

    it('ships non-overlapping preset ids', () => {
        const ids = SITE_WHITELIST_PRESETS.map((preset) => preset.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
