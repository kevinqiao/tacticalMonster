/** 异步同桌榜行状态（真人 / bot 三态：matching / playing / scored）。 */

export type AsyncLeaderboardRowInput =
  | { kind: "human"; status: string }
  | { kind: "bot"; revealAt?: number; duration?: number };

export function resolveAsyncLeaderboardRowState(
  row: AsyncLeaderboardRowInput,
  now: number
): "matching" | "playing" | "scored" {
  if (row.kind === "human") {
    const submitted =
      row.status === "finished" ||
      row.status === "confirmed" ||
      row.status === "settled";
    return submitted ? "scored" : "playing";
  }
  const at = row.revealAt;
  if (at == null || now < at) return "matching";
  const doneAt = at + (row.duration ?? 0);
  if (now < doneAt) return "playing";
  return "scored";
}
