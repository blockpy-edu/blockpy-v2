// Seeded question-pool selection (docs/architecture/06 §1.2). Deterministic:
// the same seed always draws the same subset, so the client and a regrading
// server agree on which questions were shown.

import type { QuizInstructions } from "./types";

/** mulberry32: tiny deterministic PRNG, good enough for pool draws. */
export function createRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Fisher–Yates shuffle of a copy. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
    const result = [...items];
    const rng = createRng(seed);
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Draws `amount` items; the draw is random but the result preserves the
 * original ordering so questions appear in their authored sequence.
 */
export function subsetRandomly<T>(items: readonly T[], amount: number, seed: number): T[] {
    if (amount < 0 || amount >= items.length) {
        return [...items];
    }
    const picked = new Set(shuffle(items, seed).slice(0, amount));
    return items.filter((item) => picked.has(item));
}

/**
 * The ordered ids of the questions shown for this attempt. Pool seeds follow
 * poolRandomness: SEED = submission id, ATTEMPT = submission id + attempt
 * count, NONE/GROUP = first `amount` without shuffling.
 */
export function visibleQuestionIds(
    instructions: QuizInstructions,
    submissionId: number,
    attemptCount: number,
): string[] {
    const { questions, settings, pools } = instructions;
    const pooled = new Set(pools.flatMap((pool) => pool.questions));
    const drawn = new Set<string>();
    for (const pool of pools) {
        const candidates = pool.questions.filter((id) => id in questions);
        const subset =
            settings.poolRandomness === "SEED" || settings.poolRandomness === "ATTEMPT"
                ? subsetRandomly(
                      candidates,
                      pool.amount,
                      settings.poolRandomness === "SEED"
                          ? submissionId
                          : submissionId + attemptCount,
                  )
                : candidates.slice(0, pool.amount < 0 ? candidates.length : pool.amount);
        for (const id of subset) {
            drawn.add(id);
        }
    }
    return Object.keys(questions).filter((id) => !pooled.has(id) || drawn.has(id));
}
