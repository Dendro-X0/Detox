import {
    type SiteAdapter,
    type ContentBlock,
    type EnforcementResult,
    createStableId,
    registerSiteAdapter,
} from './adapter-interface';
import type { Verdict } from '../core/types/verdict';
import { applyEnforcementToElement, revealEnforcementElement } from '../core/enforcement/apply-enforcement';
import { revealBlockedContent } from '../core/enforcement/reveal-block';

function resolveQuoraEnforcementTarget(element: HTMLElement): HTMLElement {
    return element.querySelector<HTMLElement>('.answer_content, .content, .q-text, .p1') ?? element;
}

function enforceQuoraElement(element: HTMLElement, verdict: Verdict, blockId: string): EnforcementResult {
    return applyEnforcementToElement(resolveQuoraEnforcementTarget(element), verdict, { blockId });
}

function revealQuoraElement(element: HTMLElement): void {
    revealEnforcementElement(resolveQuoraEnforcementTarget(element));
}

/**
 * Quora adapter for Detox AI.
 *
 * Targets:
 * - Answers (.Answer, .answer_content)
 * - Comments (.Comment)
 * - Answer expansions and collapsed content
 */

/** Generate a stable ID for a Quora answer or comment */
function getQuoraId(element: HTMLElement): string | null {
    // Try data attributes
    const answerId = element.getAttribute('data-aid');
    if (answerId) {
        return createStableId('quora', 'answer', answerId);
    }

    const commentId = element.getAttribute('data-cid');
    if (commentId) {
        return createStableId('quora', 'comment', commentId);
    }

    // Try to extract from permalink
    const permalink = element.querySelector('a[href*="/answer/"]') as HTMLAnchorElement | null;
    if (permalink?.href) {
        const match = permalink.href.match(/\/answer\/(\d+)/);
        if (match?.[1]) {
            return createStableId('quora', 'answer', match[1]);
        }
    }

    // Use element id if available
    if (element.id) {
        return createStableId('quora', 'element', element.id);
    }

    // Generate from author + content hash
    const author = element.querySelector('.user, .author, [class*="author"]')?.textContent?.trim();
    const text = element.textContent?.slice(0, 100) ?? '';
    if (text.length > 20) {
        const hash = fnv1a32(`${author ?? ''}:${text}`);
        return createStableId('quora', 'generated', hash);
    }

    return null;
}

/** FNV-1a 32-bit hash for generating stable IDs */
function fnv1a32(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Extract text from a Quora answer element */
function extractQuoraText(element: HTMLElement): string | null {
    // Try various content selectors
    const contentSelectors = [
        '.answer_content',
        '.Answer .content',
        '[class*="answer_content"]',
        '.UnifiedAnswerBody',
        '.q-text',
        '.p1',
        '.AnswerStoryBytes .content',
    ];

    let content: HTMLElement | null = null;
    for (const selector of contentSelectors) {
        content = element.querySelector<HTMLElement>(selector);
        if (content) break;
    }

    if (!content) {
        // Fallback: use element's direct text content
        content = element;
    }

    const text = content.textContent?.trim() ?? '';
    if (text.length < 20) return null; // Too short

    return text;
}

/** Check if element is a Quora answer */
function isAnswerElement(element: HTMLElement): boolean {
    const className = element.className?.toLowerCase() ?? '';
    return className.includes('answer') ||
           className.includes('unifiedanswer') ||
           element.matches('.Answer, [class*="Answer"]');
}

/** Check if element is a Quora comment */
function isCommentElement(element: HTMLElement): boolean {
    const className = element.className?.toLowerCase() ?? '';
    return className.includes('comment') ||
           element.matches('.Comment, [class*="Comment"]');
}

/** Find answer elements in the document */
function findAnswerElements(): HTMLElement[] {
    const elements: HTMLElement[] = [];

    const selectors = [
        '.Answer',
        '.answer_content',
        '[class*="UnifiedAnswer"]',
        '.AnswerStoryBytes',
        '[data-aid]',
    ];

    for (const selector of selectors) {
        const matches = document.querySelectorAll<HTMLElement>(selector);
        for (const el of matches) {
            if ((isAnswerElement(el) || isCommentElement(el)) && !elements.includes(el)) {
                elements.push(el);
            }
        }
    }

    return elements;
}

/** Create a ContentBlock from a DOM element */
function createBlockFromElement(element: HTMLElement): ContentBlock | null {
    const id = getQuoraId(element);
    if (!id) return null;

    const text = extractQuoraText(element);
    if (!text) return null;

    const authorEl = element.querySelector('.user, .author, [class*="author"], .name');

    return {
        id,
        text,
        element,
        metadata: {
            author: authorEl?.textContent?.trim() ?? undefined,
            timestamp: Date.now(),
        },
    };
}

/** Create the Quora adapter instance */
export function createQuoraAdapter(): SiteAdapter {
    let mutationObserver: MutationObserver | null = null;
    const knownBlocks = new Map<string, ContentBlock>();

    const adapter: SiteAdapter = {
        id: 'quora',
        name: 'Quora',

        isMatch: () => {
            return location.hostname === 'www.quora.com' ||
                   location.hostname === 'quora.com';
        },

        getBlocks: () => {
            const elements = findAnswerElements();
            const blocks: ContentBlock[] = [];

            for (const el of elements) {
                const block = createBlockFromElement(el);
                if (block && !knownBlocks.has(block.id)) {
                    blocks.push(block);
                    knownBlocks.set(block.id, block);
                    el.dataset.detoxId = block.id;
                }
            }

            return blocks;
        },

        observeChanges: (callbacks) => {
            const initialBlocks = adapter.getBlocks();
            if (initialBlocks.length > 0) {
                callbacks.onBlocksAdded(initialBlocks);
            }

            let debounceTimer: number | null = null;
            const handleMutations = (): void => {
                if (debounceTimer !== null) {
                    window.clearTimeout(debounceTimer);
                }
                debounceTimer = window.setTimeout(() => {
                    const newBlocks = adapter.getBlocks().filter(b => !knownBlocks.has(b.id));
                    if (newBlocks.length > 0) {
                        callbacks.onBlocksAdded(newBlocks);
                    }

                    const removedIds: string[] = [];
                    for (const [id, block] of knownBlocks) {
                        if (!document.contains(block.element)) {
                            removedIds.push(id);
                            knownBlocks.delete(id);
                        }
                    }
                    if (removedIds.length > 0) {
                        callbacks.onBlocksRemoved(removedIds);
                    }
                }, 500);
            };

            mutationObserver = new MutationObserver(() => {
                handleMutations();
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });

            return () => {
                mutationObserver?.disconnect();
                mutationObserver = null;
                if (debounceTimer !== null) {
                    window.clearTimeout(debounceTimer);
                }
            };
        },

        applyEnforcement: (blockId, verdict) => {
            const block = knownBlocks.get(blockId);
            if (block) {
                return enforceQuoraElement(block.element, verdict, blockId);
            }

            const element = document.querySelector<HTMLElement>(`[data-detox-id="${blockId}"]`);
            if (element) {
                return enforceQuoraElement(element, verdict, blockId);
            }

            return { success: false, error: 'Block not found' };
        },

        revealBlock: (blockId) => {
            const block = knownBlocks.get(blockId);
            if (block) {
                revealQuoraElement(block.element);
                return;
            }
            revealBlockedContent(blockId);
        },

        destroy: () => {
            mutationObserver?.disconnect();
            mutationObserver = null;
            knownBlocks.clear();
        },
    };

    return adapter;
}

// Auto-register the adapter
registerSiteAdapter(createQuoraAdapter());
