import type { BlockBlastRecordedStep } from "./seedPool/blockBlastRecordedOpTypes";
import type { CasualWatchReplayPayload } from "./casualBridgeIngest";

export function buildBlockBlastWatchReplayPayload(game: {
  seed?: string;
  gameId: string;
  recordedOps?: BlockBlastRecordedStep[];
}): CasualWatchReplayPayload | undefined {
  const steps = game.recordedOps ?? [];
  if (steps.length === 0) return undefined;
  const seedId = game.seed ?? game.gameId;
  if (!seedId) return undefined;
  return { seedId, steps };
}
