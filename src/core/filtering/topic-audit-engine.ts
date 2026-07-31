import { BOTHER_KEYWORD_MAP } from '../types/bother-keywords';
import { countKeywordHits, textMatchesKeyword } from '../rules/keyword-match';
import {
    DEFAULT_NEWS_DIET_POLICY,
    isTopicId,
    TOPIC_IDS,
    type TopicId,
    type TopicUserPolicy,
} from './topic-types';

export type TopicCorpusSample = {
    readonly id: string;
    readonly text: string;
    readonly primaryTopic: TopicId;
    readonly secondaryTopics?: readonly TopicId[];
    /** Expected block when DEFAULT_NEWS_DIET_POLICY is applied. */
    readonly blockUnderNewsDiet: boolean;
    readonly note?: string;
    readonly source?: string;
    readonly language?: string;
};

export type TopicCorpus = {
    readonly version: number;
    readonly samples: readonly TopicCorpusSample[];
};

export type TopicClassification = {
    readonly primaryTopic: TopicId | 'unknown';
    readonly confidence: number;
    readonly scores: Readonly<Partial<Record<TopicId, number>>>;
    readonly method: 'd0-keywords' | 'd1-embeddings';
};

export type TopicClassifierFn = (text: string) => TopicClassification;

export type TopicAuditMismatch = {
    readonly id: string;
    readonly text: string;
    readonly note?: string;
    readonly expectedTopic: TopicId;
    readonly predictedTopic: TopicId | 'unknown';
    readonly expectedBlock: boolean;
    readonly actualBlock: boolean;
};

export type TopicAuditReport = {
    readonly method: 'd0-keywords' | 'd1-embeddings';
    readonly policy: TopicUserPolicy;
    readonly total: number;
    readonly topicLabelAccuracy: number;
    readonly topicMislabels: readonly TopicAuditMismatch[];
    readonly policyFalsePositives: readonly TopicAuditMismatch[];
    readonly policyFalseNegatives: readonly TopicAuditMismatch[];
    readonly worldAffairsRecall: number;
    readonly techFalseBlockRate: number;
    readonly perTopicMetrics: readonly TopicPerTopicMetric[];
    readonly bbcNewsDietRecall: number;
    readonly bbcGeopoliticsKeywordBlockRate: number;
};

export type TopicPerTopicMetric = {
    readonly topic: TopicId;
    readonly precision: number;
    readonly recall: number;
    readonly support: number;
};

/** D0 baseline — keyword hints per topic (replaces phrase-list geopolitics for research). */
const TOPIC_KEYWORD_HINTS: Readonly<Record<TopicId, readonly string[]>> = {
    'world-affairs': [
        ...BOTHER_KEYWORD_MAP.geopolitics,
        'united nations',
        'nato',
        'ceasefire',
        'invasion',
        'war in',
        'troops',
        'missile',
        'border clash',
        'humanitarian crisis',
        'diplomatic',
    ],
    'domestic-politics': [
        'parliament',
        'prime minister',
        'election results',
        'congress',
        'senate',
        'white house',
        'downing street',
        'vote count',
        'ballot',
        'legislation',
    ],
    tech: [
        'software',
        'developer',
        'api',
        'github',
        'vscode',
        'vs code',
        'cli',
        'kubernetes',
        'database',
        'postgresql',
        'machine learning',
        'open source',
        'antigravity',
        'virtual machine',
        'ide',
    ],
    music: [
        'album',
        'concert',
        'tracklist',
        'spotify',
        'singer',
        'opera',
        'symphony',
        'grammy',
        'vinyl',
        'playlist',
    ],
    'culture-arts': [
        'review',
        'theatre',
        'theater',
        'film',
        'novel',
        'exhibition',
        'museum',
        'ballet',
        'director',
        'staging',
        'defies time',
    ],
    business: [
        'earnings',
        'revenue',
        'quarterly results',
        'stock',
        'market',
        'ipo',
        'merger',
        'ceo',
        'startup funding',
        'inflation',
    ],
    'health-science': [
        'clinical',
        'patient',
        'hypertension',
        'study finds',
        'researchers',
        'vaccine',
        'hospital',
        'trial',
        'peer-reviewed',
        'genome',
    ],
    sports: [
        'championship',
        'league',
        'match',
        'goal',
        'tournament',
        'olympic',
        'world cup',
        'playoffs',
        'coach',
        'score',
    ],
};

function scoreTopic(text: string, topic: TopicId): number {
    const keywords = TOPIC_KEYWORD_HINTS[topic];
    const hits = countKeywordHits(text, keywords);
    if (hits === 0) return 0;
    return Math.min(1, 0.35 + hits * 0.18);
}

/** D0 research baseline — keyword voting per topic. */
export function classifyTopicD0(text: string): TopicClassification {
    const scores: Partial<Record<TopicId, number>> = {};
    let bestTopic: TopicId | 'unknown' = 'unknown';
    let bestScore = 0;

    for (const topic of Object.keys(TOPIC_KEYWORD_HINTS) as TopicId[]) {
        const score = scoreTopic(text, topic);
        scores[topic] = score;
        if (score > bestScore) {
            bestScore = score;
            bestTopic = topic;
        }
    }

    if (bestScore < 0.35) {
        return { primaryTopic: 'unknown', confidence: 0, scores, method: 'd0-keywords' };
    }

    return {
        primaryTopic: bestTopic,
        confidence: bestScore,
        scores,
        method: 'd0-keywords',
    };
}

export function wouldBlockUnderTopicPolicy(
    classification: TopicClassification,
    policy: TopicUserPolicy
): boolean {
    const topic = classification.primaryTopic;
    if (topic === 'unknown') return false;
    if (policy.allowTopics.includes(topic)) return false;
    if (policy.blockTopics.includes(topic)) return true;
    return false;
}

export function expectedBlockForSample(
    sample: TopicCorpusSample,
    policy: TopicUserPolicy = DEFAULT_NEWS_DIET_POLICY
): boolean {
    if (policy.allowTopics.includes(sample.primaryTopic)) return false;
    if (policy.blockTopics.includes(sample.primaryTopic)) return true;
    return sample.blockUnderNewsDiet;
}

export function auditTopicCorpus(
    corpus: TopicCorpus,
    policy: TopicUserPolicy = DEFAULT_NEWS_DIET_POLICY
): TopicAuditReport {
    return auditTopicCorpusWithClassifier(corpus, classifyTopicD0, 'd0-keywords', policy);
}

function computePerTopicMetricsFromPredictions(
    corpus: TopicCorpus,
    predictions: readonly TopicClassification[]
): TopicPerTopicMetric[] {
    const metrics: TopicPerTopicMetric[] = [];

    for (const topic of TOPIC_IDS) {
        let predictedAsTopic = 0;
        let correctPredictions = 0;
        let actualAsTopic = 0;

        for (let i = 0; i < corpus.samples.length; i += 1) {
            const sample = corpus.samples[i]!;
            const predicted = predictions[i]!;
            if (sample.primaryTopic === topic) actualAsTopic += 1;
            if (predicted.primaryTopic === topic) {
                predictedAsTopic += 1;
                if (sample.primaryTopic === topic) correctPredictions += 1;
            }
        }

        metrics.push({
            topic,
            precision: predictedAsTopic > 0 ? correctPredictions / predictedAsTopic : 0,
            recall: actualAsTopic > 0 ? correctPredictions / actualAsTopic : 0,
            support: actualAsTopic,
        });
    }

    return metrics;
}

function computeBbcNewsDietRecallFromPredictions(
    corpus: TopicCorpus,
    predictions: readonly TopicClassification[],
    policy: TopicUserPolicy
): number {
    let total = 0;
    let blocked = 0;
    for (let i = 0; i < corpus.samples.length; i += 1) {
        const sample = corpus.samples[i]!;
        if (sample.source !== 'bbc' || !sample.blockUnderNewsDiet) continue;
        total += 1;
        if (wouldBlockUnderTopicPolicy(predictions[i]!, policy)) blocked += 1;
    }
    return total > 0 ? blocked / total : 0;
}

function computeBbcGeopoliticsKeywordBlockRate(corpus: TopicCorpus): number {
    const bbcBlock = corpus.samples.filter(
        (s) => s.source === 'bbc' && s.blockUnderNewsDiet
    );
    if (bbcBlock.length === 0) return 0;
    let blocked = 0;
    for (const sample of bbcBlock) {
        if (matchesGeopoliticsKeywords(sample.text)) blocked += 1;
    }
    return blocked / bbcBlock.length;
}

export function auditTopicCorpusWithClassifier(
    corpus: TopicCorpus,
    classify: TopicClassifierFn,
    method: TopicAuditReport['method'],
    policy: TopicUserPolicy = DEFAULT_NEWS_DIET_POLICY
): TopicAuditReport {
    const predictions = corpus.samples.map((sample) => classify(sample.text));
    return buildTopicAuditReport(corpus, predictions, method, policy);
}

export async function auditTopicCorpusAsync(
    corpus: TopicCorpus,
    classify: (text: string) => Promise<TopicClassification>,
    method: TopicAuditReport['method'],
    policy: TopicUserPolicy = DEFAULT_NEWS_DIET_POLICY
): Promise<TopicAuditReport> {
    const predictions: TopicClassification[] = [];
    for (const sample of corpus.samples) {
        predictions.push(await classify(sample.text));
    }
    return buildTopicAuditReport(corpus, predictions, method, policy);
}

function buildTopicAuditReport(
    corpus: TopicCorpus,
    predictions: readonly TopicClassification[],
    method: TopicAuditReport['method'],
    policy: TopicUserPolicy
): TopicAuditReport {
    const topicMislabels: TopicAuditMismatch[] = [];
    const policyFalsePositives: TopicAuditMismatch[] = [];
    const policyFalseNegatives: TopicAuditMismatch[] = [];

    let topicCorrect = 0;
    let worldAffairsTotal = 0;
    let worldAffairsCorrect = 0;
    let techTotal = 0;
    let techFalseBlocks = 0;

    for (let i = 0; i < corpus.samples.length; i += 1) {
        const sample = corpus.samples[i]!;
        const predicted = predictions[i]!;
        const expectedBlock = expectedBlockForSample(sample, policy);
        const actualBlock = wouldBlockUnderTopicPolicy(predicted, policy);

        if (predicted.primaryTopic === sample.primaryTopic) {
            topicCorrect += 1;
        } else {
            topicMislabels.push({
                id: sample.id,
                text: sample.text,
                note: sample.note,
                expectedTopic: sample.primaryTopic,
                predictedTopic: predicted.primaryTopic,
                expectedBlock,
                actualBlock,
            });
        }

        if (sample.primaryTopic === 'world-affairs') {
            worldAffairsTotal += 1;
            if (predicted.primaryTopic === 'world-affairs') worldAffairsCorrect += 1;
        }

        if (sample.primaryTopic === 'tech') {
            techTotal += 1;
            if (actualBlock && !expectedBlock) techFalseBlocks += 1;
        }

        if (expectedBlock && !actualBlock) {
            policyFalseNegatives.push({
                id: sample.id,
                text: sample.text,
                note: sample.note,
                expectedTopic: sample.primaryTopic,
                predictedTopic: predicted.primaryTopic,
                expectedBlock,
                actualBlock,
            });
        } else if (!expectedBlock && actualBlock) {
            policyFalsePositives.push({
                id: sample.id,
                text: sample.text,
                note: sample.note,
                expectedTopic: sample.primaryTopic,
                predictedTopic: predicted.primaryTopic,
                expectedBlock,
                actualBlock,
            });
        }
    }

    return {
        method,
        policy,
        total: corpus.samples.length,
        topicLabelAccuracy: corpus.samples.length > 0 ? topicCorrect / corpus.samples.length : 0,
        topicMislabels,
        policyFalsePositives,
        policyFalseNegatives,
        worldAffairsRecall:
            worldAffairsTotal > 0 ? worldAffairsCorrect / worldAffairsTotal : 0,
        techFalseBlockRate: techTotal > 0 ? techFalseBlocks / techTotal : 0,
        perTopicMetrics: computePerTopicMetricsFromPredictions(corpus, predictions),
        bbcNewsDietRecall: computeBbcNewsDietRecallFromPredictions(corpus, predictions, policy),
        bbcGeopoliticsKeywordBlockRate: computeBbcGeopoliticsKeywordBlockRate(corpus),
    };
}

export function formatTopicAuditReport(report: TopicAuditReport): string {
    const lines = [
        `Topic audit — ${report.method} @ ${new Date().toISOString()}`,
        '',
        `Samples: ${report.total}`,
        `Topic label accuracy: ${(report.topicLabelAccuracy * 100).toFixed(1)}%`,
        `World-affairs recall: ${(report.worldAffairsRecall * 100).toFixed(1)}%`,
        `Tech false-block rate (news diet): ${(report.techFalseBlockRate * 100).toFixed(1)}%`,
        `BBC news-diet recall: ${(report.bbcNewsDietRecall * 100).toFixed(1)}%`,
        `BBC geopolitics keyword block rate: ${(report.bbcGeopoliticsKeywordBlockRate * 100).toFixed(1)}%`,
        `Policy false positives: ${report.policyFalsePositives.length}`,
        `Policy false negatives: ${report.policyFalseNegatives.length}`,
        '',
        'Per-topic metrics (precision / recall / support):',
    ];

    for (const m of report.perTopicMetrics) {
        if (m.support === 0) continue;
        lines.push(
            `  ${m.topic}: ${(m.precision * 100).toFixed(0)}% / ${(m.recall * 100).toFixed(0)}% / ${m.support}`
        );
    }
    lines.push('');

    if (report.policyFalseNegatives.length > 0) {
        lines.push('False negatives (should block, did not):');
        for (const m of report.policyFalseNegatives.slice(0, 12)) {
            lines.push(
                `  ${m.id}: expected ${m.expectedTopic}, got ${m.predictedTopic} — ${m.text.slice(0, 72)}…`
            );
        }
        lines.push('');
    }

    if (report.policyFalsePositives.length > 0) {
        lines.push('False positives (should pass, blocked):');
        for (const m of report.policyFalsePositives.slice(0, 12)) {
            lines.push(
                `  ${m.id}: expected ${m.expectedTopic}, got ${m.predictedTopic} — ${m.text.slice(0, 72)}…`
            );
        }
    }

    return `${lines.join('\n')}\n`;
}

export function validateTopicCorpus(corpus: TopicCorpus): string[] {
    const errors: string[] = [];
    const ids = new Set<string>();

    for (const sample of corpus.samples) {
        if (ids.has(sample.id)) errors.push(`duplicate id: ${sample.id}`);
        ids.add(sample.id);
        if (!isTopicId(sample.primaryTopic)) {
            errors.push(`${sample.id}: invalid primaryTopic ${sample.primaryTopic}`);
        }
        if (!sample.text.trim()) errors.push(`${sample.id}: empty text`);
    }

    return errors;
}

/** Quick check whether geopolitics phrase list matches text (legacy D0). */
export function matchesGeopoliticsKeywords(text: string): boolean {
    return BOTHER_KEYWORD_MAP.geopolitics.some((phrase) => textMatchesKeyword(text, phrase));
}
