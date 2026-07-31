import type { ProviderRuntimeInfo } from '../../../core/types/detector';
import type { TopicClassification } from '../../../core/filtering/topic-audit-engine';
import {
    createD1TopicClassifierWithPromptEmbeddings,
    promptEmbeddingsFromSnapshot,
    type TopicCentroidsSnapshot,
} from '../../../core/filtering/topic-embedding-classifier';
import promptSnapshot from './prompt-embeddings.snapshot.json';

type ClassifierHandle = {
    classify: (text: string) => Promise<TopicClassification>;
};

export class TopicClassifierSession {
    private state: ProviderRuntimeInfo['state'] = 'idle';
    private lastError: string | null = null;
    private classifier: ClassifierHandle | null = null;
    private initPromise: Promise<void> | null = null;

    getRuntimeInfo(): ProviderRuntimeInfo {
        return {
            state: this.state,
            activePackId: 'topic-d1-minilm',
            lastError: this.lastError,
            hasSession: this.classifier !== null,
        };
    }

    async ensureReady(): Promise<void> {
        if (this.classifier) return;
        if (!this.initPromise) {
            this.initPromise = this.initialize();
        }
        await this.initPromise;
    }

    private async initialize(): Promise<void> {
        this.state = 'loading';
        this.lastError = null;
        try {
            const snapshot = promptSnapshot as TopicCentroidsSnapshot;
            const handle = await createD1TopicClassifierWithPromptEmbeddings({
                promptEmbeddings: promptEmbeddingsFromSnapshot(snapshot),
                modelId: snapshot.modelId,
                threshold: snapshot.threshold,
            });
            this.classifier = handle;
            this.state = 'ready';
        } catch (error: unknown) {
            this.state = 'error';
            this.lastError = error instanceof Error ? error.message : String(error);
            this.initPromise = null;
            throw error;
        }
    }

    async classifyText(text: string): Promise<TopicClassification> {
        await this.ensureReady();
        if (!this.classifier) {
            throw new Error('Topic classifier not initialized');
        }
        return this.classifier.classify(text);
    }

    async classifyBatch(texts: readonly string[]): Promise<readonly TopicClassification[]> {
        await this.ensureReady();
        if (!this.classifier) {
            throw new Error('Topic classifier not initialized');
        }
        const results: TopicClassification[] = [];
        for (const text of texts) {
            results.push(await this.classifier.classify(text));
        }
        return results;
    }
}

export const topicClassifierSession = new TopicClassifierSession();
