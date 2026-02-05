import {
    type SiteAdapter,
    type ContentBlock,
    type EnforcementResult,
    createStableId,
    registerSiteAdapter,
} from './adapter-interface';

/**
 * Reddit adapter for Detox AI.
 *
 * Targets:
 * - Posts (shreddit-post, [data-testid="post-container"])
 * - Comments ([data-testid="comment"], .Comment, shreddit-comment)
 * - Nested comment threads
 */

const MAX_ENFORCEMENT_TEXT_LENGTH: number = 800;
const MAX_ENFORCEMENT_AREA_PX: number = 1_000_000;

/** Generate a stable ID for a Reddit post or comment */
function getRedditId(element: HTMLElement): string | null {
    // Try data-testid attributes first
    const testId = element.getAttribute('data-testid');
    if (testId) {
        // Posts: "post-container", Comments: "comment"
        const thingId = element.getAttribute('data-fullname') || element.id;
        if (thingId) {
            return createStableId('reddit', testId.startsWith('post') ? 'post' : 'comment', thingId);
        }
    }

    // Try shreddit attributes (new Reddit)
    const postId = element.getAttribute('data-post-id');
    if (postId) {
        return createStableId('reddit', 'post', postId);
    }

    const commentId = element.getAttribute('data-comment-id');
    if (commentId) {
        return createStableId('reddit', 'comment', commentId);
    }

    // Fallback: use element id or generate from content hash
    if (element.id) {
        return createStableId('reddit', 'element', element.id);
    }

    // Generate ID from text content hash
    const text = element.textContent?.slice(0, 100) ?? '';
    if (text.length > 20) {
        const hash = fnv1a32(text);
        return createStableId('reddit', 'generated', hash);
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

/** Extract text from a Reddit post or comment element */
function extractRedditText(element: HTMLElement): string | null {
    // New Reddit (shreddit)
    const shredditTitle = element.querySelector('[slot="title"]');
    const shredditBody = element.querySelector('[slot="text-body"]');
    const shredditComment = element.querySelector('[slot="comment"]');

    if (shredditTitle || shredditBody) {
        const parts: string[] = [];
        if (shredditTitle) parts.push(shredditTitle.textContent ?? '');
        if (shredditBody) parts.push(shredditBody.textContent ?? '');
        const combined = parts.join('\n').trim();
        return combined.length >= 20 ? combined : null;
    }

    if (shredditComment) {
        const text = shredditComment.textContent?.trim() ?? '';
        return text.length >= 20 ? text : null;
    }

    // Old Reddit
    const title = element.querySelector('a.title, .title');
    const body = element.querySelector('.usertext-body, .md');
    const commentText = element.querySelector('.entry .usertext, .usertext-body');

    if (title || body) {
        const parts: string[] = [];
        if (title) parts.push(title.textContent ?? '');
        if (body) parts.push(body.textContent ?? '');
        const combined = parts.join('\n').trim();
        return combined.length >= 20 ? combined : null;
    }

    if (commentText) {
        const text = commentText.textContent?.trim() ?? '';
        return text.length >= 20 ? text : null;
    }

    // Generic fallback
    const text = element.textContent?.trim() ?? '';
    return text.length >= 20 ? text : null;
}

/** Check if element is a Reddit post container */
function isPostElement(element: HTMLElement): boolean {
    return (
        element.tagName.toLowerCase() === 'shreddit-post' ||
        element.getAttribute('data-testid') === 'post-container' ||
        element.classList.contains('thing') && element.classList.contains('link')
    );
}

/** Check if element is a Reddit comment container */
function isCommentElement(element: HTMLElement): boolean {
    return (
        element.tagName.toLowerCase() === 'shreddit-comment' ||
        element.getAttribute('data-testid') === 'comment' ||
        element.classList.contains('Comment') ||
        (element.classList.contains('thing') && element.classList.contains('comment'))
    );
}

/** Find all post and comment elements in the document */
function findContentElements(): HTMLElement[] {
    const selectors = [
        // New Reddit (shreddit)
        'shreddit-post',
        'shreddit-comment',
        // Data test IDs
        '[data-testid="post-container"]',
        '[data-testid="comment"]',
        // Old Reddit
        '.thing.link',
        '.thing.comment',
        '.Comment',
    ];

    const elements = new Set<HTMLElement>();
    for (const selector of selectors) {
        const matches = document.querySelectorAll<HTMLElement>(selector);
        for (const el of matches) {
            elements.add(el);
        }
    }

    return Array.from(elements);
}

/** Create a ContentBlock from a DOM element */
function createBlockFromElement(element: HTMLElement): ContentBlock | null {
    const id = getRedditId(element);
    if (!id) return null;

    const text = extractRedditText(element);
    if (!text) return null;

    const authorEl = element.querySelector('[data-testid="author-link"], .author, [slot="author"]');

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

/** Apply enforcement (blur) to a Reddit content block */
function applyEnforcementToElement(
    element: HTMLElement,
    verdict: { readonly isToxic: boolean; readonly score: number; readonly label: string }
): EnforcementResult {
    if (!verdict.isToxic) {
        return { success: true };
    }

    // Safety checks
    const text = element.textContent?.trim() ?? '';
    if (text.length > MAX_ENFORCEMENT_TEXT_LENGTH) {
        return { success: false, error: 'Element too large' };
    }

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > MAX_ENFORCEMENT_AREA_PX) {
        return { success: false, error: 'Element area too large' };
    }

    // Find the content container to blur (not the entire element with buttons)
    let target = element;
    const contentSelectors = [
        '[slot="text-body"]',
        '[slot="comment"]',
        '.usertext-body',
        '.md',
        '.entry',
    ];

    for (const selector of contentSelectors) {
        const contentEl = element.querySelector<HTMLElement>(selector);
        if (contentEl && contentEl.textContent && contentEl.textContent.length >= 20) {
            target = contentEl;
            break;
        }
    }

    // Apply blur
    target.style.filter = 'blur(10px) grayscale(100%)';
    target.style.transition = 'filter 0.5s';
    target.title = `Toxic content hidden by Detox AI (${verdict.label}: ${(verdict.score * 100).toFixed(1)}%) — Click to reveal`;
    target.style.cursor = 'pointer';

    // Store original state for reveal
    target.dataset.detoxBlocked = 'true';
    target.dataset.detoxVerdict = JSON.stringify(verdict);

    // Add click handler
    target.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        target.style.filter = 'none';
        target.style.cursor = 'initial';
        target.title = '';
        delete target.dataset.detoxBlocked;
        delete target.dataset.detoxVerdict;
    };

    return { success: true };
}

/** Reveal a previously blocked block */
function revealBlockElement(element: HTMLElement): void {
    const contentSelectors = [
        '[slot="text-body"]',
        '[slot="comment"]',
        '.usertext-body',
        '.md',
        '.entry',
    ];

    let target = element;
    for (const selector of contentSelectors) {
        const contentEl = element.querySelector<HTMLElement>(selector);
        if (contentEl) {
            target = contentEl;
            break;
        }
    }

    target.style.filter = 'none';
    target.style.cursor = 'initial';
    target.title = '';
    delete target.dataset.detoxBlocked;
    delete target.dataset.detoxVerdict;
}

/** Create the Reddit adapter instance */
export function createRedditAdapter(): SiteAdapter {
    let mutationObserver: MutationObserver | null = null;
    const knownBlocks = new Map<string, ContentBlock>();

    const adapter: SiteAdapter = {
        id: 'reddit',
        name: 'Reddit',

        isMatch: () => {
            return location.hostname.endsWith('reddit.com');
        },

        getBlocks: () => {
            const elements = findContentElements();
            const blocks: ContentBlock[] = [];

            for (const el of elements) {
                const block = createBlockFromElement(el);
                if (block) {
                    blocks.push(block);
                    knownBlocks.set(block.id, block);
                }
            }

            return blocks;
        },

        observeChanges: (callbacks) => {
            // Initial scan
            const initialBlocks = adapter.getBlocks();
            if (initialBlocks.length > 0) {
                callbacks.onBlocksAdded(initialBlocks);
            }

            // Watch for new content
            mutationObserver = new MutationObserver((mutations) => {
                const addedElements: HTMLElement[] = [];
                const removedIds: string[] = [];

                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement) {
                            if (isPostElement(node) || isCommentElement(node)) {
                                addedElements.push(node);
                            }
                            // Check children
                            const children = node.querySelectorAll<HTMLElement>(
                                'shreddit-post, shreddit-comment, [data-testid="post-container"], [data-testid="comment"], .thing.link, .thing.comment, .Comment'
                            );
                            for (const child of children) {
                                addedElements.push(child);
                            }
                        }
                    }

                    for (const node of mutation.removedNodes) {
                        if (node instanceof HTMLElement) {
                            // Find any blocks that were removed
                            for (const [id, block] of knownBlocks) {
                                if (!document.contains(block.element)) {
                                    removedIds.push(id);
                                    knownBlocks.delete(id);
                                }
                            }
                        }
                    }
                }

                // Process added elements
                if (addedElements.length > 0) {
                    const newBlocks: ContentBlock[] = [];
                    for (const el of addedElements) {
                        const block = createBlockFromElement(el);
                        if (block && !knownBlocks.has(block.id)) {
                            newBlocks.push(block);
                            knownBlocks.set(block.id, block);
                        }
                    }
                    if (newBlocks.length > 0) {
                        callbacks.onBlocksAdded(newBlocks);
                    }
                }

                // Process removed elements
                if (removedIds.length > 0) {
                    callbacks.onBlocksRemoved(removedIds);
                }
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });

            // Return cleanup function
            return () => {
                mutationObserver?.disconnect();
                mutationObserver = null;
            };
        },

        applyEnforcement: (blockId, verdict) => {
            const block = knownBlocks.get(blockId);
            if (!block) {
                // Try to find element by ID
                const elements = document.querySelectorAll<HTMLElement>('[data-detox-id]');
                for (const el of elements) {
                    if (el.dataset.detoxId === blockId) {
                        return applyEnforcementToElement(el, verdict);
                    }
                }
                return { success: false, error: 'Block not found' };
            }
            return applyEnforcementToElement(block.element, verdict);
        },

        revealBlock: (blockId) => {
            const block = knownBlocks.get(blockId);
            if (block) {
                revealBlockElement(block.element);
            } else {
                // Try to find by data attribute
                const elements = document.querySelectorAll<HTMLElement>('[data-detox-id]');
                for (const el of elements) {
                    if (el.dataset.detoxId === blockId) {
                        revealBlockElement(el);
                        break;
                    }
                }
            }
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
registerSiteAdapter(createRedditAdapter());
