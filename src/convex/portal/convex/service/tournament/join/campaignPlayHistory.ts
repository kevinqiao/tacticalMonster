import { v } from "convex/values";

import { getPortalTournamentDefinition } from "../../../data/portalTournamentConfigs";
import { campaignMultiRankPointsDeltaForPlace } from "../../campaignLeague/campaignMultiRankPoints";
import { campaignSoloPointsDelta } from "../../campaignLeague/campaignSoloPoints";
import { authedQuery } from "../../../custom/session";
import {
  buildCasualAsyncTableSummary,
  casualTableSummarySolo,
} from "../settle/async/casualAsyncTableSummary";

const DEFAULT_LIMIT = 50;
/** Scan recent campaign runs; stop once enough player seats collected. */
const RUN_SCAN_CAP = 200;

function canOfferCampaignReport(status: string): boolean {
  return status === "settled" || status === "confirmed" || status === "finished";
}

function gameLabelForType(gameType: string): string {
  if (gameType === "solitaire") return "Solitaire";
  if (gameType === "block_blast") return "Block Blast";
  if (gameType === "match_3") return "Match-3";
  if (gameType === "yatz") return "Yatz";
  return gameType;
}

/**
 * 玩家在某活动下的 Portal 对局记录。
 * Campaign 归属 SSOT：`portal_run_tournaments.campaignId`（不再写在 player_matches 上）。
 * 挑战成败 / 单局奖励快照：`portal_run_player_matches`。
 * 战报摘要按需用 `getCampaignPlayReport` 拉取（避免列表嵌入大对象失败/过重）。
 */
export const listCampaignPlayHistory = authedQuery({
  args: {
    campaignId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { campaignId, limit }) => {
    const uid = ctx.uid;
    const n = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), 100);

    const runs = await ctx.db
      .query("portal_run_tournaments")
      .withIndex("by_campaignId_createdAt", (q) => q.eq("campaignId", campaignId))
      .order("desc")
      .take(RUN_SCAN_CAP);

    const out: Array<{
      matchId: string;
      runTournamentId: string;
      gameType: string;
      mode: "solo" | "multi";
      campaignRewardMode: "pass_per_run" | "competitive_leaderboard" | null;
      score: number | null;
      rank: number | null;
      status: string;
      playedAt: number;
      startedAt: number;
      challengeSuccess: boolean | null;
      seedScoreThreshold: number | null;
      pointsDelta: number | null;
      rewardLabel: string | null;
      rewardSyncStatus: "none" | "pending" | "synced" | "failed" | null;
      /** 前端是否展示「战报」入口 */
      canOpenReport: boolean;
    }> = [];

    for (const run of runs) {
      const pm = await ctx.db
        .query("portal_run_player_matches")
        .withIndex("by_run_uid", (q) =>
          q.eq("tournamentId", String(run._id)).eq("uid", uid)
        )
        .first();
      if (!pm) continue;

      const def = getPortalTournamentDefinition(pm.templateId);
      const mode: "solo" | "multi" =
        def?.maxPlayers != null && def.maxPlayers > 1 ? "multi" : "solo";
      const campaignRewardMode =
        run.campaignRewardMode === "pass_per_run" ||
        run.campaignRewardMode === "competitive_leaderboard"
          ? run.campaignRewardMode
          : null;

      const challengeSuccess =
        typeof pm.challengeSuccess === "boolean" ? pm.challengeSuccess : null;
      const seedScoreThreshold =
        typeof pm.seedScoreThreshold === "number" && Number.isFinite(pm.seedScoreThreshold)
          ? Math.floor(pm.seedScoreThreshold)
          : null;

      let pointsDelta: number | null = null;
      if (campaignRewardMode === "competitive_leaderboard" && pm.status === "settled") {
        if (mode === "solo") {
          pointsDelta = campaignSoloPointsDelta(
            challengeSuccess === true ? true : challengeSuccess === false ? false : undefined
          );
        } else if (typeof pm.rank === "number") {
          pointsDelta = campaignMultiRankPointsDeltaForPlace(pm.rank);
        }
      }

      const rewardLabel =
        (pm.campaignRewardSyncStatus === "synced" ||
          pm.campaignRewardSyncStatus === "pending") &&
        typeof pm.campaignRewardLabel === "string" &&
        pm.campaignRewardLabel.trim()
          ? pm.campaignRewardLabel.trim()
          : null;

      out.push({
        matchId: pm.matchId,
        runTournamentId: pm.tournamentId,
        gameType: pm.gameType,
        mode,
        campaignRewardMode,
        score: pm.score ?? null,
        rank: pm.rank ?? null,
        status: pm.status,
        playedAt: pm.finishedAt ?? pm.updatedAt ?? pm.createdAt,
        startedAt: pm.createdAt,
        challengeSuccess,
        seedScoreThreshold,
        pointsDelta,
        rewardLabel,
        rewardSyncStatus: pm.campaignRewardSyncStatus ?? null,
        canOpenReport: canOfferCampaignReport(pm.status),
      });
      if (out.length >= n) break;
    }

    return out;
  },
});

/**
 * 战报按需拉取：
 * - 单人局：得分明细 + 挑战结果 + 回放上下文（与结算页 CasualGameScoreReport 同构）
 * - 多人局：同桌名次表（CasualPostSettleSummary）
 */
export const getCampaignPlayReport = authedQuery({
  args: {
    matchId: v.string(),
  },
  handler: async (ctx, { matchId }) => {
    const uid = ctx.uid;
    const pm = await ctx.db
      .query("portal_run_player_matches")
      .withIndex("by_match_uid", (q) => q.eq("matchId", matchId).eq("uid", uid))
      .unique();
    if (!pm) return null;
    if (!canOfferCampaignReport(pm.status)) return null;

    const def = getPortalTournamentDefinition(pm.templateId);
    const maxPlayers = Math.max(1, def?.maxPlayers ?? 1);
    const isSolo = maxPlayers <= 1 || def?.matchType === "solo_p75";

    const built = await buildCasualAsyncTableSummary(ctx, {
      templateId: pm.templateId,
      uid,
      maxPlayers,
      matchId: pm.matchId,
      historical: true,
    });

    const youRow = built?.rows?.find((r) => r.isYou) ?? built?.rows?.[0];
    const watchContext = youRow?.watchContext ?? null;
    const score =
      typeof pm.score === "number" && Number.isFinite(pm.score)
        ? pm.score
        : typeof youRow?.score === "number"
          ? youRow.score
          : 0;

    if (isSolo) {
      const target =
        typeof pm.seedScoreThreshold === "number" && Number.isFinite(pm.seedScoreThreshold)
          ? Math.floor(pm.seedScoreThreshold)
          : null;
      const success =
        typeof pm.challengeSuccess === "boolean"
          ? pm.challengeSuccess
          : target != null
            ? score >= target
            : undefined;

      return {
        reportKind: "solo_score" as const,
        gameType: pm.gameType,
        scoreReport: {
          gameLabel: gameLabelForType(pm.gameType),
          lines: [{ label: "本局得分", value: score }],
          totalScore: score,
          ...(target != null && success != null
            ? {
                challenge: {
                  targetScore: target,
                  achievedScore: score,
                  success,
                },
              }
            : {}),
        },
        watchContext,
      };
    }

    const tableSummary = built?.rows?.length
      ? {
          maxPlayers: built.maxPlayers,
          rows: built.rows,
          isBoardStable: true as const,
        }
      : casualTableSummarySolo(maxPlayers, score);

    return {
      reportKind: "table" as const,
      gameType: pm.gameType,
      tableSummary,
      watchContext: null,
    };
  },
});
