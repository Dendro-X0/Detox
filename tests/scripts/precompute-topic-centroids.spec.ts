// @vitest-environment node
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'vitest';
import {
    createD1TopicClassifier,
    DEFAULT_D1_SIMILARITY_THRESHOLD,
    promptEmbeddingsToSnapshot,
} from '../../src/core/filtering/topic-embedding-classifier';

const root = join(import.meta.dirname, '../..');
const cacheDir = join(root, '.cache/transformers');
const outPath = join(root, 'tests/fixtures/filtering/topic-centroids.d1.json');

it('precomputes D1 topic prompt embeddings snapshot', async () => {
    const classifier = await createD1TopicClassifier({ cacheDir });
    const snapshot = promptEmbeddingsToSnapshot(
        classifier.modelId,
        DEFAULT_D1_SIMILARITY_THRESHOLD,
        classifier.promptEmbeddings
    );
    mkdirSync(join(root, 'tests/fixtures/filtering'), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
}, 300_000);
