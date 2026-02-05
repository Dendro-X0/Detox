/// <reference types="chrome" />

/**
 * Incremental scanning engine using MutationObserver and IntersectionObserver.
 * Prioritizes visible content and handles dynamic SPA updates efficiently.
 */

type Priority = 'visible' | 'nearby' | 'hidden';

export type ScanCandidate = {
  readonly id: string;
  readonly element: HTMLElement;
  readonly text: string;
  readonly priority: Priority;
  readonly addedAt: number;
};

export type ScanCallback = (candidates: readonly ScanCandidate[]) => void;

type QueuedCandidate = {
  readonly candidate: ScanCandidate;
  readonly callback: ScanCallback;
};

const NEARBY_THRESHOLD_PX = 500;
const MAX_QUEUE_SIZE = 500;
const MUTATION_DEBOUNCE_MS = 100;

/**
 * Creates an incremental scanner that observes DOM mutations and visibility.
 */
export function createIncrementalScanner(
  root: HTMLElement,
  extractText: (el: HTMLElement) => string | null,
  onBatchReady: ScanCallback,
  options?: {
    readonly batchSize?: number;
    readonly batchIntervalMs?: number;
  }
): {
  readonly start: () => void;
  readonly stop: () => void;
  readonly flush: () => void;
} {
  const batchSize = options?.batchSize ?? 32;
  const batchIntervalMs = options?.batchIntervalMs ?? 150;

  let mutationObserver: MutationObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let idCounter = 0;
  let mutationDebounceTimer: number | null = null;

  // Queue of pending candidates
  let queue: QueuedCandidate[] = [];
  let processingInterval: number | null = null;
  let isProcessing = false;

  // Track already-seen elements to avoid duplicates
  const seenElements = new WeakSet<HTMLElement>();

  function generateId(): string {
    idCounter += 1;
    return `detox-${Date.now()}-${idCounter}`;
  }

  function isTextContainer(el: HTMLElement): boolean {
    // Skip code blocks, scripts, styles, inputs
    const tag = el.tagName.toLowerCase();
    const skipTags = ['script', 'style', 'noscript', 'pre', 'code', 'input', 'textarea', 'select'];
    if (skipTags.includes(tag)) return false;

    // Skip if no text content
    const text = el.textContent?.trim();
    if (!text || text.length < 20) return false;

    // Skip if already seen
    if (seenElements.has(el)) return false;

    return true;
  }

  function createCandidate(el: HTMLElement, priority: Priority): ScanCandidate | null {
    const text = extractText(el);
    if (!text) return null;

    seenElements.add(el);
    const id = generateId();
    el.dataset.detoxId = id;

    return {
      id,
      element: el,
      text,
      priority,
      addedAt: Date.now(),
    };
  }

  function processQueue(): void {
    if (isProcessing || queue.length === 0) return;

    isProcessing = true;

    // Sort by priority (visible first, then nearby, then hidden)
    const priorityOrder: Record<Priority, number> = { visible: 0, nearby: 1, hidden: 2 };
    queue.sort((a, b) => priorityOrder[a.candidate.priority] - priorityOrder[b.candidate.priority]);

    // Take batch
    const batch = queue.slice(0, batchSize);
    queue = queue.slice(batchSize);

    // Group by callback and invoke
    const batches = new Map<ScanCallback, ScanCandidate[]>();
    for (const { candidate, callback } of batch) {
      const existing = batches.get(callback) ?? [];
      existing.push(candidate);
      batches.set(callback, existing);
    }

    for (const [callback, candidates] of batches) {
      try {
        callback(candidates);
      } catch (e) {
        console.error('[Detox] Scan callback error:', e);
      }
    }

    isProcessing = false;

    // Schedule next if more remain
    if (queue.length > 0) {
      processingInterval = window.setTimeout(processQueue, batchIntervalMs);
    }
  }

  function handleMutations(mutations: readonly MutationRecord[]): void {
    const newElements: HTMLElement[] = [];

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check the added element itself
            if (isTextContainer(node)) {
              newElements.push(node);
            }
            // Check descendants (but limit depth for performance)
            const candidates = node.querySelectorAll<HTMLElement>('p, div, span, article, section, li, td');
            for (const el of candidates) {
              if (isTextContainer(el)) {
                newElements.push(el);
              }
            }
          }
        }
      }
    }

    if (newElements.length === 0) return;

    // Create candidates with initial 'hidden' priority
    for (const el of newElements.slice(0, 100)) {
      // Limit per mutation batch
      const candidate = createCandidate(el, 'hidden');
      if (candidate) {
        // Add to queue, respecting max size
        if (queue.length < MAX_QUEUE_SIZE) {
          queue.push({ candidate, callback: onBatchReady });
        }
        // Start observing this element for visibility
        intersectionObserver?.observe(el);
      }
    }

    // Start processing if not already running
    if (!processingInterval) {
      processQueue();
    }
  }

  function handleIntersection(entries: readonly IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const id = el.dataset.detoxId;
      if (!id) continue;

      // Update priority based on visibility
      const candidate = queue.find((q) => q.candidate.id === id)?.candidate;
      if (candidate) {
        // Update priority in place (mutating for performance)
        if (entry.isIntersecting) {
          (candidate as { priority: Priority }).priority = 'visible';
        } else {
          // Check if nearby (within threshold)
          const rect = el.getBoundingClientRect();
          const isNearby =
            rect.top < window.innerHeight + NEARBY_THRESHOLD_PX &&
            rect.bottom > -NEARBY_THRESHOLD_PX;
          (candidate as { priority: Priority }).priority = isNearby ? 'nearby' : 'hidden';
        }
      }

      // Stop observing once visible (we've set the priority)
      if (entry.isIntersecting) {
        intersectionObserver?.unobserve(el);
      }
    }
  }

  function start(): void {
    if (mutationObserver) return;

    // Set up intersection observer for visibility tracking
    intersectionObserver = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: `${NEARBY_THRESHOLD_PX}px`,
      threshold: 0.1,
    });

    // Set up mutation observer for new content
    mutationObserver = new MutationObserver((mutations) => {
      // Debounce mutations
      if (mutationDebounceTimer) {
        window.clearTimeout(mutationDebounceTimer);
      }
      mutationDebounceTimer = window.setTimeout(() => {
        handleMutations(mutations);
      }, MUTATION_DEBOUNCE_MS);
    });

    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
    });

    // Scan existing visible content immediately
    const visibleElements = root.querySelectorAll<HTMLElement>('p, div, article, section, li, td');
    for (const el of visibleElements) {
      if (!isTextContainer(el)) continue;

      const rect = el.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      if (isVisible) {
        const candidate = createCandidate(el, 'visible');
        if (candidate) {
          queue.push({ candidate, callback: onBatchReady });
        }
      }
    }

    if (queue.length > 0) {
      processQueue();
    }
  }

  function stop(): void {
    if (mutationDebounceTimer) {
      window.clearTimeout(mutationDebounceTimer);
      mutationDebounceTimer = null;
    }
    if (processingInterval) {
      window.clearTimeout(processingInterval);
      processingInterval = null;
    }
    mutationObserver?.disconnect();
    mutationObserver = null;
    intersectionObserver?.disconnect();
    intersectionObserver = null;
    queue = [];
  }

  function flush(): void {
    // Process remaining queue immediately
    while (queue.length > 0) {
      const batch = queue.slice(0, batchSize);
      queue = queue.slice(batchSize);

      const batches = new Map<ScanCallback, ScanCandidate[]>();
      for (const { candidate, callback } of batch) {
        const existing = batches.get(callback) ?? [];
        existing.push(candidate);
        batches.set(callback, existing);
      }

      for (const [callback, candidates] of batches) {
        callback(candidates);
      }
    }
  }

  return { start, stop, flush };
}
