const DEFAULT_IDLE_BUDGET_MS = 14;
const IDLE_TIMEOUT_MS = 120;
const FALLBACK_TICK_MS = 16;
const MAX_ITEMS_PER_IDLE_SLICE = 32;

export type ProgressiveScanPumpOptions = {
    readonly runSlice: (maxItems: number, budgetMs: number) => Promise<number>;
    readonly hasBacklog: () => boolean;
    readonly onSliceComplete?: (processed: number) => void;
};

/**
 * Schedules classification work on idle time so scanning keeps pace with
 * infinite-scroll pages without blocking the main thread.
 */
export class ProgressiveScanPump {
    private readonly options: ProgressiveScanPumpOptions;
    private scheduled = false;
    private running = false;

    constructor(options: ProgressiveScanPumpOptions) {
        this.options = options;
    }

    kick(immediate = false): void {
        if (this.running) {
            this.scheduled = true;
            return;
        }
        if (this.scheduled && !immediate) return;
        this.scheduled = true;

        const start = (): void => {
            this.scheduled = false;
            void this.runLoop();
        };

        if (immediate) {
            queueMicrotask(start);
            return;
        }

        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => start(), { timeout: IDLE_TIMEOUT_MS });
        } else {
            window.setTimeout(start, FALLBACK_TICK_MS);
        }
    }

    private async runLoop(): Promise<void> {
        if (this.running) return;
        this.running = true;
        try {
            do {
                this.scheduled = false;
                const budgetMs =
                    typeof requestIdleCallback === 'function'
                        ? DEFAULT_IDLE_BUDGET_MS
                        : DEFAULT_IDLE_BUDGET_MS * 2;
                const processed = await this.options.runSlice(MAX_ITEMS_PER_IDLE_SLICE, budgetMs);
                this.options.onSliceComplete?.(processed);
            } while (this.scheduled && this.options.hasBacklog());
        } finally {
            this.running = false;
            if (this.options.hasBacklog()) {
                this.kick();
            }
        }
    }

    reset(): void {
        this.scheduled = false;
        this.running = false;
    }
}
