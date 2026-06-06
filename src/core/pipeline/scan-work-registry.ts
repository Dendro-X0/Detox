import type { ContentUnit } from '../scanner/content-unit';
import { fnv1a32 } from './text-gate';

export type ScanWorkItem = {
    readonly id: string;
    readonly text: string;
    readonly hash: string;
    unit: ContentUnit;
    priority: number;
    state: 'pending' | 'processing' | 'done';
};

const VISIBLE_PRIORITY = 2;
const HIDDEN_PRIORITY = 1;

export class ScanWorkRegistry {
    private readonly items = new Map<string, ScanWorkItem>();
    private readonly insertionOrder: string[] = [];

    addUnits(units: readonly ContentUnit[], isVisible: (unit: ContentUnit) => boolean): number {
        let added = 0;
        for (const unit of units) {
            const existing = this.items.get(unit.id);
            if (existing) {
                existing.unit = unit;
                if (existing.state !== 'done') {
                    existing.priority = Math.max(existing.priority, isVisible(unit) ? VISIBLE_PRIORITY : HIDDEN_PRIORITY);
                }
                continue;
            }

            const item: ScanWorkItem = {
                id: unit.id,
                text: unit.text,
                hash: fnv1a32(unit.text),
                unit,
                priority: isVisible(unit) ? VISIBLE_PRIORITY : HIDDEN_PRIORITY,
                state: 'pending',
            };
            this.items.set(unit.id, item);
            this.insertionOrder.push(unit.id);
            added += 1;
        }
        return added;
    }

    updateVisibility(unitId: string, visible: boolean): void {
        const item = this.items.get(unitId);
        if (!item || item.state === 'done') return;
        item.priority = visible ? VISIBLE_PRIORITY : HIDDEN_PRIORITY;
    }

    updateUnitReference(unit: ContentUnit): void {
        const item = this.items.get(unit.id);
        if (!item) return;
        item.unit = unit;
    }

    remove(unitIds: readonly string[]): void {
        for (const id of unitIds) {
            const item = this.items.get(id);
            if (!item || item.state === 'done') continue;
            this.items.delete(id);
            const index = this.insertionOrder.indexOf(id);
            if (index >= 0) this.insertionOrder.splice(index, 1);
        }
    }

    pendingCount(): number {
        let count = 0;
        for (const item of this.items.values()) {
            if (item.state === 'pending') count += 1;
        }
        return count;
    }

    totalCount(): number {
        return this.items.size;
    }

    doneCount(): number {
        let count = 0;
        for (const item of this.items.values()) {
            if (item.state === 'done') count += 1;
        }
        return count;
    }

    takeBatch(maxItems: number): ScanWorkItem[] {
        if (maxItems <= 0) return [];
        const pending = this.insertionOrder
            .map((id) => this.items.get(id))
            .filter((item): item is ScanWorkItem => item !== undefined && item.state === 'pending')
            .sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return this.insertionOrder.indexOf(a.id) - this.insertionOrder.indexOf(b.id);
            });

        const batch = pending.slice(0, maxItems);
        for (const item of batch) {
            item.state = 'processing';
        }
        return batch;
    }

    markDone(ids: readonly string[]): void {
        for (const id of ids) {
            const item = this.items.get(id);
            if (item) item.state = 'done';
        }
    }

    releaseProcessing(ids: readonly string[]): void {
        for (const id of ids) {
            const item = this.items.get(id);
            if (item && item.state === 'processing') item.state = 'pending';
        }
    }

    clear(): void {
        this.items.clear();
        this.insertionOrder.length = 0;
    }
}
