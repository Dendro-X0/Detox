/// <reference types="chrome" />

import type { Verdict } from '../core/types/verdict';
import { isAdapterModEnabled } from '../mods/mod-manifest';

/**
 * A content block extracted from a webpage.
 * This represents a unit of content that can be classified (e.g., a comment, post, or message).
 */
export type ContentBlock = {
    /** Unique identifier for this block (used for caching and enforcement) */
    readonly id: string;
    /** The text content to classify */
    readonly text: string;
    /** The DOM element associated with this block */
    readonly element: HTMLElement;
    /** Metadata about the block */
    readonly metadata?: {
        readonly author?: string;
        readonly timestamp?: number;
        readonly parentId?: string;
    };
};

/**
 * Result of applying enforcement to a content block.
 */
export type EnforcementResult = {
    readonly success: boolean;
    readonly error?: string;
};

/**
 * Options for site adapter creation.
 */
export type SiteAdapterOptions = {
    /** Called when new blocks are detected */
    readonly onBlocksAdded?: (blocks: readonly ContentBlock[]) => void;
    /** Called when blocks are removed */
    readonly onBlocksRemoved?: (blockIds: readonly string[]) => void;
    /** Called when blocks are updated */
    readonly onBlocksUpdated?: (blocks: readonly ContentBlock[]) => void;
};

/**
 * Interface for site-specific content extraction and enforcement.
 *
 * Each adapter knows how to:
 * - Extract content blocks from a specific site (Reddit, YouTube, etc.)
 * - Observe changes to those blocks (SPA navigation, new comments)
 * - Apply enforcement actions (blur, hide, replace) safely
 * - Generate stable IDs for caching
 */
export interface SiteAdapter {
    /** Unique identifier for this adapter */
    readonly id: string;

    /** Human-readable name */
    readonly name: string;

    /** Check if this adapter supports the current page */
    readonly isMatch: () => boolean;

    /** Extract all content blocks from the current page */
    readonly getBlocks: () => readonly ContentBlock[];

    /**
     * Start observing for content changes.
     * Returns a cleanup function to stop observing.
     */
    readonly observeChanges: (callbacks: {
        readonly onBlocksAdded: (blocks: readonly ContentBlock[]) => void;
        readonly onBlocksRemoved: (blockIds: readonly string[]) => void;
        readonly onBlocksUpdated: (blocks: readonly ContentBlock[]) => void;
    }) => () => void;

    /**
     * Apply enforcement to a content block.
     * @param blockId The ID of the block to enforce
     * @param verdict The classification verdict
     * @returns Result of the enforcement action
     */
    readonly applyEnforcement: (blockId: string, verdict: Verdict) => EnforcementResult;

    /**
     * Reveal a previously blocked block (user clicked to show).
     * @param blockId The ID of the block to reveal
     */
    readonly revealBlock: (blockId: string) => void;

    /** Clean up any resources used by this adapter */
    readonly destroy: () => void;
}

/**
 * Registry of available site adapters.
 */
const adapters = new Map<string, SiteAdapter>();

/**
 * Register a site adapter.
 */
export function registerSiteAdapter(adapter: SiteAdapter): void {
    adapters.set(adapter.id, adapter);
}

export function unregisterSiteAdapter(id: string): void {
    adapters.delete(id);
}

/**
 * Get the best matching adapter for the current page.
 * Returns null if no adapter matches.
 */
export function getMatchingAdapter(): SiteAdapter | null {
    for (const adapter of adapters.values()) {
        if (!isAdapterModEnabled(adapter.id)) continue;
        if (adapter.isMatch()) {
            return adapter;
        }
    }
    return null;
}

/**
 * Create a stable ID from a string (e.g., post/comment ID).
 */
export function createStableId(site: string, type: string, identifier: string): string {
    return `detox-${site}-${type}-${identifier}`;
}
