import type { RolloutSummary, SeedPoolEntry } from "./blockBlastRecordedOpTypes";
import {
  simulateSeedRollouts,
  type SimulateSeedRolloutsOptions,
} from "./blockBlastSeedSimulator";
import { toRolloutSummaries } from "./blockBlastSeedPoolRunner";

/** index-only 池在 index.json 存 metrics；完整 rollouts 按需重模拟。 */
export function simulateRolloutsForSeedEntry(
  entry: Pick<SeedPoolEntry, "seedId" | "metrics">,
  rolloutCount?: number,
  opts: SimulateSeedRolloutsOptions = {}
): {
  rollouts: ReturnType<typeof simulateSeedRollouts>["rollouts"];
  metrics: ReturnType<typeof simulateSeedRollouts>["metrics"];
  rolloutSummaries: RolloutSummary[];
  rolloutsCollapsed: boolean;
} {
  const k = rolloutCount ?? entry.metrics.rolloutCount ?? 1;
  const matchSeconds = opts.matchSeconds ?? entry.metrics.matchTimeLimitSec;
  const result = simulateSeedRollouts(entry.seedId, k, { ...opts, matchSeconds });
  return {
    ...result,
    rolloutSummaries: toRolloutSummaries(result.rollouts),
  };
}
