import type { Verdict } from '../../../core/types/verdict';
import { classifyTextBehavior } from '../../../core/filtering/content-behavior-signals';
import { getMergedAdaptationRules } from '../../../core/adaptation/adaptation-pack-registry';
import { domContextBoost, type DomContextSignals } from '../../../core/filtering/dom-context-signals';
import { BEHAVIOR_SIGNALS_DETECTOR_ID } from '../../../core/runtime/constants';

export { BEHAVIOR_SIGNALS_DETECTOR_ID };

export function classifyBehaviorSignals(
    text: string,
    threshold: number,
    domContext?: DomContextSignals
): Verdict {
    const boost = domContext ? domContextBoost(domContext) : 0;
    const merged = getMergedAdaptationRules();
    let behaviorBoost = boost;
    for (const [, weightBoost] of Object.entries(merged.behaviorWeightBoosts)) {
        behaviorBoost += weightBoost ?? 0;
    }
    const result = classifyTextBehavior(text, { threshold, domBoost: Math.min(0.35, behaviorBoost) });
    return {
        matched: result.matched,
        score: result.score,
        labelId: result.labelId,
        detectorId: BEHAVIOR_SIGNALS_DETECTOR_ID,
    };
}
