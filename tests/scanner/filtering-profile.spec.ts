import { describe, expect, it, vi } from 'vitest';
import { detectPageContexts } from '../../src/core/adaptation/page-context';
import {
    BUILTIN_NON_SOCIAL_HOST_THRESHOLDS,
    auditThresholdForMode,
    isBuiltinNonSocialHost,
    resolveClassificationThreshold,
    shouldApplySupplementaryDetectors,
} from '../../src/core/filtering/filtering-profile';

vi.mock('../../src/core/policy/policy-store', () => ({
    getThresholdForHost: vi.fn(() => 0.5),
}));

describe('filtering-profile', () => {
    it('uses conservative built-in threshold on music and review hosts', () => {
        expect(resolveClassificationThreshold('open.spotify.com')).toBe(0.72);
        expect(resolveClassificationThreshold('www.rateyourmusic.com')).toBe(0.72);
        expect(resolveClassificationThreshold('example.com')).toBe(0.5);
    });

    it('resolves audit thresholds per browsing mode preset', () => {
        expect(auditThresholdForMode('focus', 'example.com')).toBe(0.5);
        expect(auditThresholdForMode('research', 'example.com')).toBe(0.7);
        expect(auditThresholdForMode('focus', 'open.spotify.com')).toBe(0.72);
    });

    it('flags known non-social leisure hosts', () => {
        expect(isBuiltinNonSocialHost('discogs.com')).toBe(true);
        expect(isBuiltinNonSocialHost('reddit.com')).toBe(false);
    });

    it('skips supplementary detectors without feed context', () => {
        expect(shouldApplySupplementaryDetectors([])).toBe(false);
        expect(shouldApplySupplementaryDetectors(null)).toBe(false);
        expect(shouldApplySupplementaryDetectors(['social-feed'])).toBe(true);
        expect(shouldApplySupplementaryDetectors(['news'])).toBe(true);
    });

    it('detects no feed context on Spotify and RYM', () => {
        expect(detectPageContexts('https://open.spotify.com/album/abc')).toEqual([]);
        expect(detectPageContexts('https://rateyourmusic.com/release/album/x')).toEqual([]);
        expect(shouldApplySupplementaryDetectors(detectPageContexts('https://open.spotify.com/album/abc'))).toBe(
            false
        );
    });

    it('still applies supplementary detectors on Reddit', () => {
        const contexts = detectPageContexts('https://www.reddit.com/r/listening/comments/abc/title/');
        expect(contexts).toContain('social-feed');
        expect(shouldApplySupplementaryDetectors(contexts)).toBe(true);
    });

    it('includes music streaming whitelist hosts in built-in map', () => {
        expect(BUILTIN_NON_SOCIAL_HOST_THRESHOLDS['open.spotify.com']).toBe(0.72);
        expect(BUILTIN_NON_SOCIAL_HOST_THRESHOLDS['deezer.com']).toBe(0.72);
    });
});
