import type { SeedPoolEntry, RolloutSummary } from "./solitaireRecordedOpTypes";
import {
  simulateSeedRollouts,
  type SimulateSeedRolloutsOptions,
} from "./solitaireSeedSimulator";
import { toRolloutSummaries } from "./solitaireSeedPoolRunner";

/**
 * Index-only pools store metrics in index.json; full rollouts are simulated on demand.
 */
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
