import {
    type SiteAdapter,
    type ContentBlock,
    type EnforcementResult,
    createStableId,
    registerSiteAdapter,
} from './adapter-interface';

/**
 * YouTube adapter for Detox AI.
 *
 * Targets:
 * - Comments (ytd-comment-renderer)
 * - Comment threads and replies
 */

const MAX_ENFORCEMENT_TEXT_LENGTH: number = 800;
const MAX_ENFORCEMENT_AREA_PX: number = 1_000_000;

/** Generate a stable ID for a YouTube comment */
function getYouTubeId(element: HTMLElement): string | null {
    // Try data attribute for comment ID
    const commentId = element.getAttribute('data-comment-id');
    if (commentId) {
        return createStableId('youtube', 'comment', commentId);
    }

    // Try to extract from permalink URL
    const permalink = element.querySelector('a[href*="lc="]') as HTMLAnchorElement | null;
    if (permalink?.href) {
        const match = permalink.href.match(/lc=([a-zA-Z0-9_-]+)/);
        if (match?.[1]) {
            return createStableId('youtube', 'comment', match[1]);
        }
    }

    // Use element id if available
    if (element.id) {
        return createStableId('youtube', 'element', element.id);
    }

    // Generate from author + text hash
    const author = element.querySelector('#author-text, .ytd-comment-author-text')?.textContent?.trim();
    const text = element.textContent?.slice(0, 100) ?? '';
    if (text.length > 20 && author) {
        const hash = fnv1a32(`${author}:${text}`);
        return createStableId('youtube', 'generated', hash);
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

/** Extract text from a YouTube comment element */
function extractYouTubeText(element: HTMLElement): string | null {
    // Main comment text
    const content = element.querySelector('#content-text, #expander #content-text, .ytd-comment-renderer #content-text');
    if (!content) return null;

    const text = content.textContent?.trim() ?? '';
    if (text.length < 10) return null; // Too short to be meaningful

    return text;
}

/** Check if element is a YouTube comment */
function isCommentElement(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    return tag === 'ytd-comment-renderer' ||
           tag === 'ytd-comment-thread-renderer' ||
           element.classList.contains('ytd-comment-renderer');
}

/** Find comment elements in the document */
function findCommentElements(): HTMLElement[] {
    const elements: HTMLElement[] = [];

    // Primary selector for YouTube comments
    const selectors = [
        'ytd-comment-renderer',
        'ytd-comment-thread-renderer > ytd-comment-renderer',
    ];

    for (const selector of selectors) {
        const matches = document.querySelectorAll<HTMLElement>(selector);
        for (const el of matches) {
            if (isCommentElement(el)) {
                elements.push(el);
            }
        }
    }

    return elements;
}

/** Create a ContentBlock from a DOM element */
function createBlockFromElement(element: HTMLElement): ContentBlock | null {
    const id = getYouTubeId(element);
    if (!id) return null;

    const text = extractYouTubeText(element);
    if (!text) return null;

    const authorEl = element.querySelector('#author-text, .ytd-comment-author-text, #name');

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

/** Apply enforcement (blur) to a comment element */
function applyEnforcementToElement(
    element: HTMLElement,
    verdict: { readonly isToxic: boolean; readonly score: number; readonly label: string }
): EnforcementResult {
    if (!verdict.isToxic) {
        return { success: true };
    }

    // Find the content text element to blur
    const target = element.querySelector('#content-text, #expander') as HTMLElement | null;
    if (!target) {
        return { success: false, error: 'Target element not found' };
    }

    // Safety checks
    const text = target.textContent?.trim() ?? '';
    if (text.length > MAX_ENFORCEMENT_TEXT_LENGTH) {
        return { success: false, error: 'Element too large' };
    }

    const rect = target.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > MAX_ENFORCEMENT_AREA_PX) {
        return { success: false, error: 'Element area too large' };
    }

    // Apply blur
    target.style.filter = 'blur(10px) grayscale(100%)';
    target.style.transition = 'filter 0.5s';
    target.title = `Toxic content hidden by Detox AI (${verdict.label}: ${(verdict.score * 100).toFixed(1)}%) — Click to reveal`;
    target.style.cursor = 'pointer';

    // Store state for reveal
    target.dataset.detoxBlocked = 'true';
    target.dataset.detoxVerdict = JSON.stringify(verdict);
    target.dataset.detoxId = element.dataset.detoxId || 'unknown';

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

/** Reveal a previously blocked element */
function revealBlockElement(element: HTMLElement): void {
    const target = element.querySelector('#content-text, #expander') as HTMLElement | null;
    if (!target) return;

    target.style.filter = 'none';
    target.style.cursor = 'initial';
    target.title = '';
    delete target.dataset.detoxBlocked;
    delete target.dataset.detoxVerdict;
}

/** Create the YouTube adapter instance */
export function createYouTubeAdapter(): SiteAdapter {
    let mutationObserver: MutationObserver | null = null;
    const knownBlocks = new Map<string, ContentBlock>();

    const adapter: SiteAdapter = {
        id: 'youtube',
        name: 'YouTube',

        isMatch: () => {
            return location.hostname === 'www.youtube.com' ||
                   location.hostname === 'youtube.com' ||
                   location.hostname === 'm.youtube.com';
        },

        getBlocks: () => {
            const elements = findCommentElements();
            const blocks: ContentBlock[] = [];

            for (const el of elements) {
                const block = createBlockFromElement(el);
                if (block && !knownBlocks.has(block.id)) {
                    blocks.push(block);
                    knownBlocks.set(block.id, block);
                    // Mark element with data attribute for later lookup
                    el.dataset.detoxId = block.id;
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

            // Debounced mutation handler
            let debounceTimer: number | null = null;
            const handleMutations = (): void => {
                if (debounceTimer !== null) {
                    window.clearTimeout(debounceTimer);
                }
                debounceTimer = window.setTimeout(() => {
                    // Check for new comments
                    const newBlocks = adapter.getBlocks().filter(b => !knownBlocks.has(b.id));
                    if (newBlocks.length > 0) {
                        callbacks.onBlocksAdded(newBlocks);
                    }

                    // Check for removed comments
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
                }, 500); // Slightly longer debounce for YouTube's dynamic loading
            };

            mutationObserver = new MutationObserver(() => {
                handleMutations();
            });

            // Observe the comments section specifically
            const commentsSection = document.querySelector('ytd-comments, #comments');
            if (commentsSection) {
                mutationObserver.observe(commentsSection, {
                    childList: true,
                    subtree: true,
                });
            } else {
                // Fallback to body if comments section not found yet
                mutationObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                });
            }

            // Return cleanup function
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
                return applyEnforcementToElement(block.element, verdict);
            }

            // Try to find by data attribute
            const element = document.querySelector<HTMLElement>(`[data-detox-id="${blockId}"]`);
            if (element) {
                return applyEnforcementToElement(element, verdict);
            }

            return { success: false, error: 'Block not found' };
        },

        revealBlock: (blockId) => {
            const block = knownBlocks.get(blockId);
            if (block) {
                revealBlockElement(block.element);
            } else {
                const element = document.querySelector<HTMLElement>(`[data-detox-id="${blockId}"]`);
                if (element) {
                    revealBlockElement(element);
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
registerSiteAdapter(createYouTubeAdapter());
