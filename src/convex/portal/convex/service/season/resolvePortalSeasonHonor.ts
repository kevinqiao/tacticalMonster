/**
 * Partner 赛季日历 + Lobby 参与门控（join_now | next_season）。
 */
import {
  normalizeSeasonEpochWeekKey,
  portalNextSeasonStartWeekKey,
  portalSeasonIdFromWeekKey,
  portalSeasonWeekOf,
  portalWeekKeyAtOrAfter,
  PORTAL_SEASON_EPOCH_WEEK_KEY,
} from "../../data/portalSeasonHonorConfig";
import { weeklyPeriodKey } from "../../utils/casualTaskPeriod";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export type PortalSeasonHonorMode = "join_now" | "next_season";

export type PortalSeasonHonorContext = {
  epochWeekKey: string;
  weekKey: string;
  seasonId: string;
  seasonWeek: number;
  seasonWeeks: number;
  mode: PortalSeasonHonorMode;
  startsWeekKey: string | null;
  /** false → 不加 XP、Lobby 不显示 Season 条 */
  active: boolean;
};

export async function readPartnerSeasonEpochWeekKey(
  ctx: QueryCtx | MutationCtx,
  partnerId: number
): Promise<string> {
  const row = await ctx.db
    .query("portal_partner_lobby_ops_settings")
    .withIndex("by_partnerId", (q) => q.eq("partnerId", partnerId))
    .unique();
  return normalizeSeasonEpochWeekKey(
    row?.seasonEpochWeekKey ?? PORTAL_SEASON_EPOCH_WEEK_KEY
  );
}

function normalizeHonorMode(
  mode: string | undefined | null
): PortalSeasonHonorMode {
  return mode === "next_season" ? "next_season" : "join_now";
}

/**
 * 解析 lobby 赛季荣誉上下文。
 * Mutation 路径可 persist 缺失的 `seasonHonorStartsWeekKey`。
 */
export async function resolveSeasonHonorContext(
  ctx: QueryCtx | MutationCtx,
  lobbyId: Id<"portal_lobbies">,
  now: number = Date.now(),
  opts?: { persistStartsWeekKey?: boolean }
): Promise<PortalSeasonHonorContext | null> {
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) return null;

  const epochWeekKey = await readPartnerSeasonEpochWeekKey(ctx, lobby.partnerId);
  const weekKey = weeklyPeriodKey(now);
  const seasonId = portalSeasonIdFromWeekKey(weekKey, epochWeekKey);
  const { weekOf, weeks } = portalSeasonWeekOf(weekKey, epochWeekKey);
  const mode = normalizeHonorMode(lobby.seasonHonorMode);

  let startsWeekKey = lobby.seasonHonorStartsWeekKey ?? null;
  if (mode === "next_season" && !startsWeekKey) {
    startsWeekKey = portalNextSeasonStartWeekKey(weekKey, epochWeekKey);
    if (opts?.persistStartsWeekKey && "db" in ctx) {
      const mut = ctx as MutationCtx;
      await mut.db.patch(lobbyId, {
        seasonHonorStartsWeekKey: startsWeekKey,
        updatedAt: now,
      });
    }
  }

  const active =
    mode === "join_now" ||
    (startsWeekKey != null && portalWeekKeyAtOrAfter(weekKey, startsWeekKey));

  return {
    epochWeekKey,
    weekKey,
    seasonId,
    seasonWeek: weekOf,
    seasonWeeks: weeks,
    mode,
    startsWeekKey: mode === "next_season" ? startsWeekKey : null,
    active,
  };
}
