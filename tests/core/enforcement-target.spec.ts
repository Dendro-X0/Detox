import { describe, expect, it } from 'vitest';
import {
    pickEnforcementElement,
    resolveVisualContainer,
} from '../../src/core/enforcement/enforcement-target';

function mount(html: string): HTMLElement {
    document.body.innerHTML = html;
    return document.body.firstElementChild as HTMLElement;
}

describe('resolveVisualContainer', () => {
    it('returns the scanner unit when it wraps a text leaf', () => {
        const card = mount(`
            <article style="width:280px;height:160px;display:block">
                <h3>Promo headline</h3>
                <p>Download the app for the latest news and updates on your phone today.</p>
            </article>
        `);
        const paragraph = card.querySelector('p') as HTMLElement;
        expect(resolveVisualContainer(card, paragraph)).toBe(card);
    });

    it('falls back to the leaf when the scanner unit is too large', () => {
        const page = mount(`
            <div style="width:900px;height:900px;display:block">
                <p>Short promo text about downloading the application now.</p>
            </div>
        `);
        const paragraph = page.querySelector('p') as HTMLElement;
        expect(resolveVisualContainer(page, paragraph)).toBe(paragraph);
    });
});

describe('pickEnforcementElement', () => {
    it('promotes enforcement to the card when the scanner unit is a reasonable frame', () => {
        const card = mount(`
            <article style="width:280px;height:160px;display:block">
                <h3>Culture drama headline</h3>
                <p>Your child's boyfriend starts dating your daughter — drama explores what happens next.</p>
            </article>
        `);
        const paragraph = card.querySelector('p') as HTMLElement;
        expect(pickEnforcementElement(card, paragraph)).toBe(card);
    });
});
