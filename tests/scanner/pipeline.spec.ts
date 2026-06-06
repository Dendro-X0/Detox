import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassificationPipeline } from '../../src/core/pipeline/classification-pipeline';
import { applyUnitEnforcement } from '../../src/core/enforcement/apply-unit-enforcement';
import { isDomainAllowlisted } from '../../src/core/rules/user-rules-store';
import { recordBlocksDiscovered, recordBlocksScanned } from '../../src/core/storage/scan-stats-store';
import type { ContentUnit } from '../../src/core/scanner/content-unit';

vi.mock('../../src/core/rules/user-rules-store', () => ({
    isDomainAllowlisted: vi.fn(() => false),
}));

vi.mock('../../src/core/policy/policy-store', () => ({
    getThresholdForHost: vi.fn(() => 0.5),
}));

vi.mock('../../src/core/storage/scan-stats-store', () => ({
    recordBlocksDiscovered: vi.fn().mockResolvedValue(undefined),
    recordBlocksScanned: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/core/storage/extension-session', () => ({
    sessionGet: vi.fn().mockResolvedValue([]),
    sessionSet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/core/enforcement/apply-unit-enforcement', () => ({
    applyUnitEnforcement: vi.fn(() => ({ success: true })),
    revealContentUnit: vi.fn(),
}));

const CLASSIFYABLE_TEXT =
    'Synthetic paragraph with plenty of ASCII letters so the text gate allows classification in pipeline unit tests.';

function makeUnit(id: string, text = CLASSIFYABLE_TEXT): ContentUnit {
    const element = document.createElement('p');
    element.textContent = text;
    return { id, text, element };
}

async function flushPipeline(pipeline: ClassificationPipeline): Promise<void> {
    pipeline.kickProgressiveScan(true);
    await new Promise<void>((resolve) => {
        queueMicrotask(() => queueMicrotask(resolve));
    });
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

describe('8.4 — classification pipeline', () => {
    let sendMessage: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        sendMessage = vi.fn((request: { type: string; items?: readonly { id: string; text: string }[] }, callback) => {
            if (request.type === 'classifyBatch' && request.items) {
                callback({
                    type: 'classifyBatchResult',
                    results: request.items.map((item) => ({
                        id: item.id,
                        matched: false,
                        score: 0.1,
                        labelId: 'neutral',
                        detectorId: 'heuristic-keywords',
                    })),
                });
            }
        });

        vi.stubGlobal('chrome', {
            runtime: {
                sendMessage,
                lastError: null,
            },
        });

        vi.mocked(isDomainAllowlisted).mockReturnValue(false);
        vi.mocked(recordBlocksDiscovered).mockClear();
        vi.mocked(recordBlocksScanned).mockClear();
        vi.mocked(applyUnitEnforcement).mockClear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('skips work when pipeline is disabled', async () => {
        const pipeline = new ClassificationPipeline({ isEnabled: () => false });
        pipeline.handleUnitsAdded([makeUnit('disabled-1')]);
        await flushPipeline(pipeline);

        expect(sendMessage).not.toHaveBeenCalled();
        expect(pipeline.getScanProgress().total).toBe(0);
    });

    it('skips work on allowlisted domains', async () => {
        vi.mocked(isDomainAllowlisted).mockReturnValue(true);
        const pipeline = new ClassificationPipeline({ isEnabled: () => true });
        pipeline.handleUnitsAdded([makeUnit('allow-1')]);
        await flushPipeline(pipeline);

        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('classifies each pending unit once per session', async () => {
        const recorded: string[] = [];
        const pipeline = new ClassificationPipeline({
            isEnabled: () => true,
            onClassificationRecorded: () => {
                recorded.push('tick');
            },
        });

        pipeline.handleUnitsAdded([
            makeUnit('unit-a'),
            makeUnit('unit-b', `${CLASSIFYABLE_TEXT} Variant B for second id.`),
        ]);
        await flushPipeline(pipeline);

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(recorded.length).toBeGreaterThanOrEqual(2);
        expect(pipeline.getScanProgress().done).toBe(2);
        expect(pipeline.getScanProgress().pending).toBe(0);
    });

    it('reuses verdict cache for identical text hashes', async () => {
        const pipeline = new ClassificationPipeline({ isEnabled: () => true });

        pipeline.handleUnitsAdded([makeUnit('hash-a')]);
        await flushPipeline(pipeline);

        pipeline.handleUnitsAdded([makeUnit('hash-b')]);
        await flushPipeline(pipeline);

        expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it('does not re-classify the same unit id after rescan', async () => {
        const pipeline = new ClassificationPipeline({ isEnabled: () => true });
        const unit = makeUnit('stable-id');

        pipeline.handleUnitsAdded([unit]);
        await flushPipeline(pipeline);

        pipeline.handleUnitsAdded([unit]);
        await flushPipeline(pipeline);

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(pipeline.getScanProgress().done).toBe(1);
    });
});
