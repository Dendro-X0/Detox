#!/usr/bin/env node
/**
 * Precompute D1 topic prompt embeddings snapshot for faster offline audits.
 *
 * Usage: pnpm precompute:topic-centroids
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache/transformers');
const outPath = join(root, 'tests/fixtures/filtering/topic-centroids.d1.json');

const {
    createD1TopicClassifier,
    promptEmbeddingsToSnapshot,
    DEFAULT_D1_SIMILARITY_THRESHOLD,
} = await import('../src/core/filtering/topic-embedding-classifier.ts');

console.log('Loading embedding model and building topic prompt embeddings…');
const classifier = await createD1TopicClassifier({ cacheDir });
const snapshot = promptEmbeddingsToSnapshot(
    classifier.modelId,
    DEFAULT_D1_SIMILARITY_THRESHOLD,
    classifier.promptEmbeddings
);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
