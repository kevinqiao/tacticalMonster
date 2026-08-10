/** Parse clear / P75 / P90 target scores from arena `loadGame` response. */

export type CasualHudTargetScores = {
  /** Clear-bar threshold (challenge / settle success). */
  targetScore?: number;
  targetScoreP75?: number;
  targetScoreP90?: number;
};

function finiteScore(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : undefined;
}

export function casualHudTargetsFromLoadRes(res: {
  seedScoreThreshold?: number;
  seedScoreThresholdP75?: number;
  seedScoreThresholdP90?: number;
  game?: { targetScore?: number };
}): CasualHudTargetScores {
  const fromClear = finiteScore(res.seedScoreThreshold);
  const fromGame = finiteScore(res.game?.targetScore);
  return {
    targetScore: fromClear ?? fromGame,
    targetScoreP75: finiteScore(res.seedScoreThresholdP75),
    targetScoreP90: finiteScore(res.seedScoreThresholdP90),
  };
}
