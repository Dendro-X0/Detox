import { describe, expect, it } from 'vitest';
import { collectAnchorKey } from '../../src/core/scanner/anchor-attributes';
import { fingerprintElement } from '../../src/core/scanner/fingerprints';
import { loadScannerFixture } from './load-fixture';

describe('9.3 — anchor fingerprint stability', () => {
    it('collectAnchorKey gathers stable ancestor attributes', () => {
        const document = loadScannerFixture('anchor-swap.html');
        const paragraph = document.querySelector('[data-fixture-unit="anchor-comment"]') as HTMLElement;
        const key = collectAnchorKey(paragraph, document);

        expect(key).toContain('data-testid=comment');
        expect(key).toContain('data-thing-id=t1_xyz');
        expect(key).toContain('id=t1_xyz');
    });

    it('keeps fingerprint when inner host is replaced but anchor shell remains', () => {
        const document = loadScannerFixture('anchor-swap.html');
        const paragraph = document.querySelector('[data-fixture-unit="anchor-comment"]') as HTMLElement;
        const text = paragraph.textContent ?? '';
        const beforeId = fingerprintElement(paragraph, document, text);

        const host = document.querySelector('#text-host')!;
        const replacement = document.createElement('div');
        const newParagraph = document.createElement('p');
        newParagraph.textContent = text;
        replacement.appendChild(newParagraph);
        host.replaceWith(replacement);

        const afterId = fingerprintElement(newParagraph, document, text);
        expect(afterId).toBe(beforeId);
    });

    it('dom-swap fixture keeps fingerprint after host replacement via stable ancestor anchor', () => {
        const document = loadScannerFixture('dom-swap.html');
        const before = document.querySelector('[data-fixture-unit="swap-comment"]') as HTMLElement;
        const text = before.textContent ?? '';
        const beforeId = fingerprintElement(before, document, text);

        const host = document.querySelector('#comment-host')!;
        const replacement = document.createElement('div');
        const newParagraph = document.createElement('p');
        newParagraph.textContent = text;
        replacement.appendChild(newParagraph);
        host.replaceWith(replacement);

        const afterId = fingerprintElement(newParagraph, document, text);
        expect(afterId).toBe(beforeId);
    });
});
