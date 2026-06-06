import { describe, expect, it } from 'vitest';
import {
    deriveScanStatus,
    formatRelativeTimeMs,
    SCAN_PLATEAU_IDLE_MS,
} from '../../src/core/scanner/scan-diagnostics';

describe('scan diagnostics helpers', () => {
    it('deriveScanStatus marks disabled when focus mode is off', () => {
        expect(
            deriveScanStatus({
                enabled: false,
                pendingRescan: false,
                queuePending: 0,
                queueDepth: 0,
                lastScanAtMs: Date.now(),
                nowMs: Date.now(),
            })
        ).toBe('disabled');
    });

    it('deriveScanStatus prefers scanning over plateau', () => {
        const now = 100_000;
        expect(
            deriveScanStatus({
                enabled: true,
                pendingRescan: false,
                queuePending: 2,
                queueDepth: 0,
                lastScanAtMs: now - SCAN_PLATEAU_IDLE_MS - 1,
                nowMs: now,
            })
        ).toBe('scanning');
    });

    it('deriveScanStatus reports plateau after idle window', () => {
        const now = 200_000;
        expect(
            deriveScanStatus({
                enabled: true,
                pendingRescan: false,
                queuePending: 0,
                queueDepth: 0,
                lastScanAtMs: now - SCAN_PLATEAU_IDLE_MS - 5,
                nowMs: now,
            })
        ).toBe('plateau');
    });

    it('formatRelativeTimeMs renders human-readable deltas', () => {
        const now = 60_000;
        expect(formatRelativeTimeMs(now - 3_000, now)).toBe('just now');
        expect(formatRelativeTimeMs(now - 45_000, now)).toBe('45s ago');
    });
});
