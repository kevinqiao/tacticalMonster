/**
 * 再战交分：仅当新分更高时采用；否则保留再战前成绩。
 * `baseline` 缺失（非再战）时直接用新分。
 */
export function resolveReplayKeepBestScore(args: {
  rawScore: number;
  replayBaselineScore?: number | null;
}): { score: number; keptBaseline: boolean } {
  const raw = Number.isFinite(args.rawScore) ? args.rawScore : 0;
  const baseline = args.replayBaselineScore;
  if (typeof baseline !== "number" || !Number.isFinite(baseline)) {
    return { score: raw, keptBaseline: false };
  }
  if (raw > baseline) {
    return { score: raw, keptBaseline: false };
  }
  return { score: baseline, keptBaseline: true };
}
