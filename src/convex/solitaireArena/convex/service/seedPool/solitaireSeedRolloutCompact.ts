import type { SolitaireRolloutScript } from "./solitaireRecordedOpTypes";

/** Default: one bot probe per layout when rollout count is not specified. */
export const DEFAULT_LAYOUT_PROBE_ROLLOUTS = 1;

export function rolloutsAreIdentical(rollouts: SolitaireRolloutScript[]): boolean {
  if (rollouts.length <= 1) return true;
  const first = rollouts[0]!;
  const firstSig = rolloutSignature(first);
  return rollouts.every((r) => rolloutSignature(r) === firstSig);
}

function rolloutSignature(r: SolitaireRolloutScript): string {
  return `${r.finalScore}|${r.terminalReason}|${r.ops.length}|${r.elapsedSimSeconds}`;
}

/** Drop duplicate scripts when every rollout matches (saves disk / index noise). */
export function compactRolloutsForStorage(
  rollouts: SolitaireRolloutScript[]
): SolitaireRolloutScript[] {
  if (rollouts.length <= 1) return rollouts;
  if (!rolloutsAreIdentical(rollouts)) return rollouts;
  return [rollouts[0]!];
}
