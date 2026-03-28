/**
 * 与 convex gameScoreService.pickScoreTier 行为一致（供测试与前端展示复用）
 */
export function pickScoreTier<T extends { minScore: number }>(
    totalScore: number,
    tiers: T[] | undefined
): T | undefined {
    if (!tiers?.length) return undefined;
    const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
    for (const t of sorted) {
        if (totalScore >= t.minScore) return t;
    }
    return undefined;
}
