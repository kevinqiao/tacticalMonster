import type { BlockBlastRolloutScript } from "./blockBlastRecordedOpTypes";

/** 未指定 rollout 数时，每个 layout 的默认探针数。 */
export const DEFAULT_LAYOUT_PROBE_ROLLOUTS = 1;

function rolloutSignature(r: BlockBlastRolloutScript): string {
  return `${r.finalScore}|${r.terminalReason}|${r.ops.length}|${r.elapsedSimSeconds}`;
}

export function rolloutsAreIdentical(rollouts: BlockBlastRolloutScript[]): boolean {
  if (rollouts.length <= 1) return true;
  const firstSig = rolloutSignature(rollouts[0]!);
  return rollouts.every((r) => rolloutSignature(r) === firstSig);
}

/** 全部 rollout 相同时只保留一条（省存储 / 降索引噪声）。 */
export function compactRolloutsForStorage(
  rollouts: BlockBlastRolloutScript[]
): BlockBlastRolloutScript[] {
  if (rollouts.length <= 1) return rollouts;
  if (!rolloutsAreIdentical(rollouts)) return rollouts;
  return [rollouts[0]!];
}
