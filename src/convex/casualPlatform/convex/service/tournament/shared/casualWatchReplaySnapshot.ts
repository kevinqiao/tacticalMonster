import type { Doc } from "../../../_generated/dataModel";

export type CasualWatchReplayStep = Record<string, unknown>;

export function parseWatchReplayStepsFromPlayerGame(
  pg: Pick<Doc<"casual_run_player_games">, "watchReplaySeedId" | "watchReplayStepsJson">
): { seedId?: string; steps: CasualWatchReplayStep[] } {
  if (!pg.watchReplayStepsJson) {
    return { steps: [] };
  }
  try {
    const parsed = JSON.parse(pg.watchReplayStepsJson) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { steps: [] };
    }
    return {
      seedId: pg.watchReplaySeedId,
      steps: parsed as CasualWatchReplayStep[],
    };
  } catch {
    return { steps: [] };
  }
}

export function serializeWatchReplaySnapshot(args: {
  seedId: string;
  steps: readonly unknown[];
}): { watchReplaySeedId: string; watchReplayStepsJson: string } | undefined {
  if (!args.seedId || args.steps.length === 0) return undefined;
  return {
    watchReplaySeedId: args.seedId,
    watchReplayStepsJson: JSON.stringify(args.steps),
  };
}
