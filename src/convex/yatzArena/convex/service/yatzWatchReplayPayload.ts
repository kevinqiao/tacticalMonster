import type { YatzGameState } from "../types/YatzTypes";
import type { CasualWatchReplayPayload } from "./casualBridgeIngest";

export function buildYatzWatchReplayPayload(
  game: Pick<YatzGameState, "seed" | "gameId" | "recordedOps">
): CasualWatchReplayPayload | undefined {
  const steps = game.recordedOps ?? [];
  if (steps.length === 0) return undefined;
  const seedId = game.seed ?? game.gameId;
  if (!seedId) return undefined;
  return { seedId, steps };
}
