import type { Doc } from "../../../_generated/dataModel";
import { isCasualAsyncVirtualOpponentUid } from "../settle/async/casualAsyncTypes";

export type AsyncJoinMatchFields = Pick<
  Doc<"portal_run_matches">,
  | "completed"
  | "openPhase"
  | "joinOpen"
  | "humanPlayerCount"
  | "maxPlayers"
  | "botsSeeded"
  | "templateId"
>;

export type AsyncJoinSeatFields = Pick<
  Doc<"portal_run_player_matches">,
  "uid" | "status"
>;

/** Close when any real human has submitted / finished their seat. */
export function humanSeatBlocksAsyncJoin(status: string): boolean {
  return (
    status === "finished" ||
    status === "confirmed" ||
    status === "settled"
  );
}

export function isAsyncMatchJoinable(args: {
  match: AsyncJoinMatchFields;
  humanSeats: AsyncJoinSeatFields[];
  templateId: string;
}): boolean {
  const { match, humanSeats, templateId } = args;
  if (match.templateId !== templateId) return false;
  if (match.completed) return false;
  if (match.openPhase !== "ready") return false;
  if (match.joinOpen !== true) return false;
  if (match.botsSeeded === true) return false;

  const humans = humanSeats.filter((s) => !isCasualAsyncVirtualOpponentUid(s.uid));
  if (humans.some((s) => humanSeatBlocksAsyncJoin(s.status))) return false;

  const seated = Math.max(match.humanPlayerCount ?? 0, humans.length);
  if (seated >= match.maxPlayers) return false;
  return true;
}

/** Async multi stores profile eff; capacity is maxPlayers. Ensure >1. */
export function resolveAsyncMatchEffectiveHumans(evaluated: number): number {
  const n = Math.floor(evaluated);
  if (!Number.isFinite(n) || n < 2) return 2;
  return n;
}
