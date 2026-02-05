import {
    type SiteAdapter,
    type ContentBlock,
    type EnforcementResult,
    createStableId,
    registerSiteAdapter,
} from './adapter-interface';

/**
 * Generic fallback adapter for sites without specific adapters.
 *
 * This adapter extracts text blocks from any webpage using heuristics:
 * - Paragraphs with substantial text content
 * - Article sections
 * - Main content areas
 * - Comment-like sections (generic selectors)
 */

const MAX_ENFORCEMENT_TEXT_LENGTH: number = 800;
const MAX_ENFORCEMENT_AREA_PX: number = 1_000_000;
const MIN_TEXT_LENGTH: number = 50;

/** FNV-1a 32-bit hash for generating stable IDs */
function fnv1a32(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Generate a stable ID for a content element */
function getGenericId(element: HTMLElement): string {
    // Use element's own id if available
    if (element.id) {
        return createStableId('generic', 'element', element.id);
    }

    // Use data attributes
    const dataId = element.dataset.id || element.dataset.postId || element.dataset.commentId;
    if (dataId) {
        return createStableId('generic', 'data', dataId);
    }

    // Generate from content hash
    const text = element.textContent?.slice(0, 200) ?? '';
    const hash = fnv1a32(text);
    return createStableId('generic', 'generated', hash);
}

/** Check if an element should be skipped (code, navigation, etc.) */
function shouldSkipElement(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    const skipTags = ['script', 'style', 'noscript', 'iframe', 'canvas', 'svg', 'pre', 'code', 'nav', 'header', 'footer', 'aside'];
    if (skipTags.includes(tag)) return true;

    // Skip by ARIA role
    const role = element.getAttribute('role');
    if (role === 'navigation' || role === 'banner' || role === 'complementary' || role === 'contentinfo') return true;

    // Skip elements inside code blocks
    if (element.closest('pre, code, .code, .highlight')) return true;

    // Skip navigation-related elements by class/ID patterns
    const classAndId = `${element.className} ${element.id}`.toLowerCase();
    const navPatterns = [
        'nav', 'menu', 'navbar', 'navigation', 'sidebar',
        'breadcrumb', 'pagination', 'pager', 'tabs',
        'header', 'footer', 'topbar', 'toolbar',
        'dropdown', 'popover', 'tooltip',
    ];
    if (navPatterns.some(p => classAndId.includes(p))) return true;

    // Skip button-like and interactive elements
    if (element.closest('button, [role="button"], .btn, .button')) return true;

    // Skip form elements
    if (element.closest('form, input, textarea, select, label, fieldset, legend')) return true;

    // Skip very short text (likely UI labels)
    const text = element.textContent?.trim() ?? '';
    if (text.length < MIN_TEXT_LENGTH) return true;
    if (text.split(/\s+/).length < 8) return true; // Less than 8 words

    // Skip elements with mostly capitalized text (likely UI labels)
    const words = text.split(/\s+/).filter(w => w.length > 1);
    const allCapsWords = words.filter(w => w === w.toUpperCase());
    if (words.length > 0 && allCapsWords.length / words.length > 0.5) return true;

    // Skip elements inside nav/header/footer landmarks
    if (element.closest('nav, header, footer, aside, [role="navigation"], [role="banner"]')) return true;

    return false;
}

/** Extract clean text from an element */
function extractText(element: HTMLElement): string | null {
    const text = element.textContent?.trim() ?? '';
    if (text.length < MIN_TEXT_LENGTH) return null;

    // Skip if mostly non-Latin (heuristic for language gating)
    let asciiLetterCount = 0;
    let nonLatinCount = 0;
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        const isAsciiLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        if (isAsciiLetter) asciiLetterCount += 1;
        const isBasicLatin = code <= 0x024f;
        if (!isBasicLatin) nonLatinCount += 1;
    }
    const minLetters = 12;
    if (asciiLetterCount < minLetters && nonLatinCount > 0) return null;
    const nonLatinRatio = text.length > 0 ? nonLatinCount / text.length : 0;
    if (nonLatinRatio >= 0.15) return null;

    return text;
}

/** Find content elements in the document */
function findContentElements(): HTMLElement[] {
    const elements: HTMLElement[] = [];

    // Try semantic content selectors first
    const contentSelectors = [
        'article',
        '[role="article"]',
        '.post',
        '.entry',
        '.content',
        '.comment',
        '.message',
        'main p',
        '.main p',
        '#content p',
    ];

    for (const selector of contentSelectors) {
        const matches = document.querySelectorAll<HTMLElement>(selector);
        for (const el of matches) {
            if (!shouldSkipElement(el) && extractText(el)) {
                elements.push(el);
            }
        }
    }

    // If no semantic elements found, fall back to paragraphs with substantial content
    if (elements.length === 0) {
        const paragraphs = document.querySelectorAll<HTMLElement>('p, div');
        for (const el of paragraphs) {
            if (!shouldSkipElement(el)) {
                const text = extractText(el);
                if (text && text.length >= MIN_TEXT_LENGTH) {
                    elements.push(el);
                }
            }
        }
    }

    return elements;
}

/** Create a ContentBlock from a DOM element */
function createBlockFromElement(element: HTMLElement): ContentBlock | null {
    if (shouldSkipElement(element)) return null;

    const id = getGenericId(element);
    const text = extractText(element);
    if (!text) return null;

    return {
        id,
        text,
        element,
        metadata: {
            timestamp: Date.now(),
        },
    };
}

/** Apply enforcement (blur) to an element */
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

    // Apply blur
    element.style.filter = 'blur(10px) grayscale(100%)';
    element.style.transition = 'filter 0.5s';
    element.title = `Toxic content hidden by Detox AI (${verdict.label}: ${(verdict.score * 100).toFixed(1)}%) — Click to reveal`;
    element.style.cursor = 'pointer';

    // Store state for reveal
    element.dataset.detoxBlocked = 'true';
    element.dataset.detoxVerdict = JSON.stringify(verdict);
    element.dataset.detoxId = element.dataset.detoxId || getGenericId(element);

    // Add click handler
    element.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        element.style.filter = 'none';
        element.style.cursor = 'initial';
        element.title = '';
        delete element.dataset.detoxBlocked;
        delete element.dataset.detoxVerdict;
    };

    return { success: true };
}

/** Reveal a previously blocked element */
function revealBlockElement(element: HTMLElement): void {
    element.style.filter = 'none';
    element.style.cursor = 'initial';
    element.title = '';
    delete element.dataset.detoxBlocked;
    delete element.dataset.detoxVerdict;
}

/** Create the generic adapter instance */
export function createGenericAdapter(): SiteAdapter {
    let mutationObserver: MutationObserver | null = null;
    const knownBlocks = new Map<string, ContentBlock>();

    const adapter: SiteAdapter = {
        id: 'generic',
        name: 'Generic',

        isMatch: () => {
            // This is the fallback adapter - it always matches
            return true;
        },

        getBlocks: () => {
            const elements = findContentElements();
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
                    // Check for new blocks
                    const newBlocks = adapter.getBlocks().filter(b => !knownBlocks.has(b.id));
                    if (newBlocks.length > 0) {
                        callbacks.onBlocksAdded(newBlocks);
                    }

                    // Check for removed blocks
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
                }, 250);
            };

            mutationObserver = new MutationObserver(() => {
                handleMutations();
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });

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

// Auto-register as fallback
registerSiteAdapter(createGenericAdapter());
