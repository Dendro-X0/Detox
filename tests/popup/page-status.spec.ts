import { describe, expect, it } from 'vitest';
import { hostnameFromTabUrl, resolvePopupPageStatus } from '../../src/popup/page-status';

describe('popup page status', () => {
    it('detects http(s) hostnames from tab urls', () => {
        expect(hostnameFromTabUrl('https://mail.google.com/mail/u/0/')).toBe('mail.google.com');
        expect(hostnameFromTabUrl('chrome://extensions/')).toBeNull();
    });

    it('prioritizes whitelist over focus mode', () => {
        expect(
            resolvePopupPageStatus({
                enabled: true,
                hostname: 'mail.google.com',
                allowDomains: ['mail.google.com'],
                pageStats: { pageKey: '', discovered: 0, scanned: 0, filtered: 0 },
            })
        ).toBe('whitelisted');
    });

    it('reports filtered counts when matches exist', () => {
        expect(
            resolvePopupPageStatus({
                enabled: true,
                hostname: 'reddit.com',
                allowDomains: [],
                pageStats: { pageKey: '', discovered: 10, scanned: 10, filtered: 3 },
            })
        ).toBe('filtered');
    });

    it('reports focus off before idle scanning', () => {
        expect(
            resolvePopupPageStatus({
                enabled: false,
                hostname: 'reddit.com',
                allowDomains: [],
                pageStats: { pageKey: '', discovered: 0, scanned: 0, filtered: 0 },
            })
        ).toBe('focusOff');
    });
});
