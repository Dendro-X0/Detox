import type { TopicId } from './topic-types';
import type { TopicClassification } from './topic-audit-engine';
import { TOPIC_EMBEDDING_PROMPTS } from './topic-embedding-prompts';

export const TOPIC_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
/** MiniLM cosine scores on short headlines typically sit ~0.28–0.55. */
export const DEFAULT_D1_SIMILARITY_THRESHOLD = 0.28;

export type EmbeddingVector = Float32Array;
export type TopicCentroids = Readonly<Partial<Record<TopicId, EmbeddingVector>>>;
export type TopicPromptEmbeddings = Readonly<Partial<Record<TopicId, readonly EmbeddingVector[]>>>;
export type FeatureExtractor = (text: string) => Promise<EmbeddingVector>;

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i += 1) {
        dot += a[i]! * b[i]!;
    }
    return dot;
}

export function normalizeEmbedding(vector: EmbeddingVector): EmbeddingVector {
    let norm = 0;
    for (let i = 0; i < vector.length; i += 1) {
        norm += vector[i]! * vector[i]!;
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vector;
    const out = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i += 1) {
        out[i] = vector[i]! / norm;
    }
    return out;
}

export function meanEmbedding(vectors: readonly EmbeddingVector[]): EmbeddingVector {
    if (vectors.length === 0) return new Float32Array(0);
    const dim = vectors[0]!.length;
    const sum = new Float32Array(dim);
    for (const vector of vectors) {
        for (let i = 0; i < dim; i += 1) {
            sum[i] += vector[i]!;
        }
    }
    for (let i = 0; i < dim; i += 1) {
        sum[i] /= vectors.length;
    }
    return normalizeEmbedding(sum);
}

/** Classify using best prompt match per topic (max-pool), better for short headlines. */
export function classifyTopicFromPromptEmbeddings(
    textEmbedding: EmbeddingVector,
    promptEmbeddings: TopicPromptEmbeddings,
    threshold: number = DEFAULT_D1_SIMILARITY_THRESHOLD
): TopicClassification {
    const normalized = normalizeEmbedding(textEmbedding);
    const scores: Partial<Record<TopicId, number>> = {};
    let bestTopic: TopicId | 'unknown' = 'unknown';
    let bestScore = 0;

    for (const [topic, vectors] of Object.entries(promptEmbeddings) as [
        TopicId,
        readonly EmbeddingVector[],
    ][]) {
        let topicBest = 0;
        for (const promptVector of vectors) {
            topicBest = Math.max(topicBest, cosineSimilarity(normalized, promptVector));
        }
        scores[topic] = topicBest;
        if (topicBest > bestScore) {
            bestScore = topicBest;
            bestTopic = topic;
        }
    }

    if (bestScore < threshold) {
        return { primaryTopic: 'unknown', confidence: bestScore, scores, method: 'd1-embeddings' };
    }

    return {
        primaryTopic: bestTopic,
        confidence: bestScore,
        scores,
        method: 'd1-embeddings',
    };
}

/** Classify text embedding against precomputed topic centroids. */
export function classifyTopicFromCentroids(
    textEmbedding: EmbeddingVector,
    centroids: TopicCentroids,
    threshold: number = DEFAULT_D1_SIMILARITY_THRESHOLD
): TopicClassification {
    const normalized = normalizeEmbedding(textEmbedding);
    const scores: Partial<Record<TopicId, number>> = {};
    let bestTopic: TopicId | 'unknown' = 'unknown';
    let bestScore = 0;

    for (const [topic, centroid] of Object.entries(centroids) as [TopicId, EmbeddingVector][]) {
        const score = cosineSimilarity(normalized, centroid);
        scores[topic] = score;
        if (score > bestScore) {
            bestScore = score;
            bestTopic = topic;
        }
    }

    if (bestScore < threshold) {
        return { primaryTopic: 'unknown', confidence: bestScore, scores, method: 'd1-embeddings' };
    }

    return {
        primaryTopic: bestTopic,
        confidence: bestScore,
        scores,
        method: 'd1-embeddings',
    };
}

export async function buildTopicPromptEmbeddings(
    extract: FeatureExtractor,
    prompts: Readonly<Record<TopicId, readonly string[]>> = TOPIC_EMBEDDING_PROMPTS
): Promise<TopicPromptEmbeddings> {
    const embeddings: Partial<Record<TopicId, EmbeddingVector[]>> = {};
    for (const topic of Object.keys(prompts) as TopicId[]) {
        const vectors: EmbeddingVector[] = [];
        for (const prompt of prompts[topic]) {
            vectors.push(normalizeEmbedding(await extract(prompt)));
        }
        embeddings[topic] = vectors;
    }
    return embeddings;
}

export async function buildTopicCentroids(
    extract: FeatureExtractor,
    prompts: Readonly<Record<TopicId, readonly string[]>> = TOPIC_EMBEDDING_PROMPTS
): Promise<TopicCentroids> {
    const centroids: Partial<Record<TopicId, EmbeddingVector>> = {};
    for (const topic of Object.keys(prompts) as TopicId[]) {
        const vectors: EmbeddingVector[] = [];
        for (const prompt of prompts[topic]) {
            vectors.push(await extract(prompt));
        }
        centroids[topic] = meanEmbedding(vectors);
    }
    return centroids;
}

type TransformersPipeline = (
    text: string,
    options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array }>;

export async function createFeatureExtractor(options?: {
    modelId?: string;
    cacheDir?: string;
    remoteHost?: string;
}): Promise<FeatureExtractor> {
    const { pipeline, env } = await import('@xenova/transformers');
    if (options?.cacheDir) {
        env.cacheDir = options.cacheDir;
    }
    env.allowRemoteModels = true;
    env.allowLocalModels = true;
    env.remoteHost =
        options?.remoteHost ??
        process.env.HF_ENDPOINT ??
        process.env.HUGGINGFACE_HUB_URL ??
        'https://hf-mirror.com/';

    const modelId = options?.modelId ?? TOPIC_EMBEDDING_MODEL;
    const extractor = (await pipeline('feature-extraction', modelId)) as TransformersPipeline;

    return async (text: string): Promise<EmbeddingVector> => {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return output.data;
    };
}

export type TopicCentroidsSnapshot = {
    readonly modelId: string;
    readonly threshold: number;
    readonly mode: 'centroids' | 'prompts';
    readonly centroids?: Readonly<Record<string, readonly number[]>>;
    readonly prompts?: Readonly<Record<string, readonly (readonly number[])[]>>;
};

export function centroidsFromSnapshot(snapshot: TopicCentroidsSnapshot): TopicCentroids {
    const centroids: Partial<Record<TopicId, EmbeddingVector>> = {};
    for (const [topic, values] of Object.entries(snapshot.centroids ?? {})) {
        centroids[topic as TopicId] = new Float32Array(values);
    }
    return centroids;
}

export function promptEmbeddingsFromSnapshot(
    snapshot: TopicCentroidsSnapshot
): TopicPromptEmbeddings {
    const embeddings: Partial<Record<TopicId, EmbeddingVector[]>> = {};
    for (const [topic, vectors] of Object.entries(snapshot.prompts ?? {})) {
        embeddings[topic as TopicId] = vectors.map((v) => new Float32Array(v));
    }
    return embeddings;
}

export function centroidsToSnapshot(
    modelId: string,
    threshold: number,
    centroids: TopicCentroids
): TopicCentroidsSnapshot {
    const serialized: Record<string, number[]> = {};
    for (const [topic, vector] of Object.entries(centroids)) {
        serialized[topic] = Array.from(vector!);
    }
    return { modelId, threshold, mode: 'centroids', centroids: serialized };
}

export function promptEmbeddingsToSnapshot(
    modelId: string,
    threshold: number,
    promptEmbeddings: TopicPromptEmbeddings
): TopicCentroidsSnapshot {
    const serialized: Record<string, number[][]> = {};
    for (const [topic, vectors] of Object.entries(promptEmbeddings)) {
        serialized[topic] = vectors!.map((v) => Array.from(v));
    }
    return { modelId, threshold, mode: 'prompts', prompts: serialized };
}

export async function createD1TopicClassifierWithPromptEmbeddings(options: {
    promptEmbeddings: TopicPromptEmbeddings;
    modelId?: string;
    cacheDir?: string;
    threshold?: number;
}): Promise<{
    classify: (text: string) => Promise<TopicClassification>;
    promptEmbeddings: TopicPromptEmbeddings;
    modelId: string;
}> {
    const extract = await createFeatureExtractor({
        modelId: options.modelId,
        cacheDir: options.cacheDir,
    });
    const threshold = options.threshold ?? DEFAULT_D1_SIMILARITY_THRESHOLD;
    const modelId = options.modelId ?? TOPIC_EMBEDDING_MODEL;

    return {
        modelId,
        promptEmbeddings: options.promptEmbeddings,
        classify: async (text: string) => {
            const embedding = await extract(text);
            return classifyTopicFromPromptEmbeddings(
                embedding,
                options.promptEmbeddings,
                threshold
            );
        },
    };
}

export async function createD1TopicClassifierWithCentroids(options: {
    centroids: TopicCentroids;
    modelId?: string;
    cacheDir?: string;
    threshold?: number;
}): Promise<{
    classify: (text: string) => Promise<TopicClassification>;
    centroids: TopicCentroids;
    modelId: string;
}> {
    const extract = await createFeatureExtractor({
        modelId: options.modelId,
        cacheDir: options.cacheDir,
    });
    const threshold = options.threshold ?? DEFAULT_D1_SIMILARITY_THRESHOLD;
    const modelId = options.modelId ?? TOPIC_EMBEDDING_MODEL;

    return {
        modelId,
        centroids: options.centroids,
        classify: async (text: string) => {
            const embedding = await extract(text);
            return classifyTopicFromCentroids(embedding, options.centroids, threshold);
        },
    };
}

export async function createD1TopicClassifier(options?: {
    modelId?: string;
    cacheDir?: string;
    threshold?: number;
    prompts?: Readonly<Record<TopicId, readonly string[]>>;
}): Promise<{
    classify: (text: string) => Promise<TopicClassification>;
    promptEmbeddings: TopicPromptEmbeddings;
    modelId: string;
}> {
    const extract = await createFeatureExtractor({
        modelId: options?.modelId,
        cacheDir: options?.cacheDir,
    });
    const promptEmbeddings = await buildTopicPromptEmbeddings(extract, options?.prompts);
    return createD1TopicClassifierWithPromptEmbeddings({
        promptEmbeddings,
        modelId: options?.modelId,
        cacheDir: options?.cacheDir,
        threshold: options?.threshold,
    });
}
