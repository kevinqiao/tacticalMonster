import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getTournamentDefinition } from "../../data/casualTournamentConfigs";

/** 默认再战窗口：30 分钟 */
export const CASUAL_DEFAULT_REPLAY_WINDOW_MS = 30 * 60 * 1000;

export function getReplayWindowMs(_templateId: string): number {
  return CASUAL_DEFAULT_REPLAY_WINDOW_MS;
}

export function isHumanSubmittedStatus(status: string): boolean {
  return status === "finished" || status === "confirmed" || status === "settled";
}

export function isReplayableFinished(
  pm: { status: string; finishedAt?: number },
  templateId: string,
  now: number
): boolean {
  if (pm.status !== "finished") return false;
  const at = pm.finishedAt;
  if (at == null || !Number.isFinite(at)) return true;
  return now < at + getReplayWindowMs(templateId);
}

export async function promoteFinishedToConfirmedIfExpired(
  ctx: MutationCtx,
  pm: Doc<"casual_run_player_matches">,
  now: number
): Promise<Doc<"casual_run_player_matches">> {
  if (pm.status !== "finished") return pm;
  if (isReplayableFinished(pm, pm.templateId, now)) return pm;
  await ctx.db.patch(pm._id, {
    status: "confirmed",
    updatedAt: now,
  });
  const fresh = await ctx.db.get(pm._id);
  return fresh ?? { ...pm, status: "confirmed" as const, updatedAt: now };
}

export async function promoteExpiredFinishedInMatch(
  ctx: MutationCtx,
  matchId: string,
  now: number
): Promise<void> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();
  for (const row of rows) {
    if (row.status === "finished" && !isReplayableFinished(row, row.templateId, now)) {
      await ctx.db.patch(row._id, { status: "confirmed", updatedAt: now });
    }
  }
}

export function matchAllHumansSettled(humanPms: Array<{ status: string }>): boolean {
  return humanPms.length > 0 && humanPms.every((p) => p.status === "settled");
}

export function allHumansSubmitted(humanPms: Array<{ status: string }>): boolean {
  return humanPms.length > 0 && humanPms.every((p) => isHumanSubmittedStatus(p.status));
}

export function canUseReplayForTemplate(templateId: string): boolean {
  const def = getTournamentDefinition(templateId);
  if (!def) return false;
  return def.entry.kind !== "seasonVouchers";
}
