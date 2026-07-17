import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../../_generated/server";
import type { CampaignLeagueMode } from "./campaignLeagueConfig";
import { ensureCampaignLeagueBoardAndBots, getCampaignLeagueBoard } from "./campaignLeagueBotFill";
import {
  buildMergedCampaignLeagueLeaderboard,
  listCampaignLeagueHumans,
  rankCampaignLeagueRows,
} from "./campaignLeagueMerge";
import { upsertCampaignLeagueHumanEntry } from "./campaignLeagueUpsert";

const modeValidator = v.union(v.literal("solo"), v.literal("multi"));

export const getCampaignLeagueLeaderboard = query({
  args: {
    campaignId: v.string(),
    mode: modeValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const merged = await buildMergedCampaignLeagueLeaderboard(ctx, {
      campaignId: args.campaignId,
      mode: args.mode as CampaignLeagueMode,
    });
    return rankCampaignLeagueRows(merged, limit).map(({ sortValue: _s, ...row }) => row);
  },
});

export const getCampaignLeagueLeaderboardInternal = internalQuery({
  args: {
    campaignId: v.string(),
    mode: v.optional(modeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const board = await getCampaignLeagueBoard(ctx, args.campaignId);
    const mode = (args.mode ?? board?.mode ?? "solo") as CampaignLeagueMode;
    const limit = args.limit ?? 20;
    const merged = await buildMergedCampaignLeagueLeaderboard(ctx, {
      campaignId: args.campaignId,
      mode,
    });
    return {
      mode,
      rows: rankCampaignLeagueRows(merged, limit).map(({ sortValue: _s, ...row }) => row),
    };
  },
});

export const listCampaignLeagueHumansRankedInternal = internalQuery({
  args: {
    campaignId: v.string(),
    mode: v.optional(modeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const board = await getCampaignLeagueBoard(ctx, args.campaignId);
    const mode = (args.mode ?? board?.mode ?? "solo") as CampaignLeagueMode;
    const limit = args.limit ?? 100;
    const humans = await listCampaignLeagueHumans(ctx, {
      campaignId: args.campaignId,
      mode,
      limit,
    });
    const rows = humans.map((h) => {
      const sortValue = h.rankPoints ?? 0;
      return {
        uid: h.uid,
        displayName: h.uid.slice(0, 8),
        isBot: false as const,
        bestScore: h.bestScore,
        rankPoints: sortValue,
        plays: h.plays,
        sortValue,
      };
    });
    rows.sort((a, b) => {
      if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue;
      return a.uid.localeCompare(b.uid);
    });
    return {
      mode,
      rows: rankCampaignLeagueRows(rows, limit).map(({ sortValue: _s, ...row }) => row),
    };
  },
});

export const ensureCampaignLeagueBotsInternal = internalMutation({
  args: {
    campaignId: v.string(),
    partnerId: v.number(),
    mode: modeValidator,
    dueTime: v.number(),
    startsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const result = await ensureCampaignLeagueBoardAndBots(ctx, {
      campaignId: args.campaignId,
      partnerId: args.partnerId,
      mode: args.mode,
      dueTime: args.dueTime,
      startsAt: args.startsAt,
    });
    return { ok: true as const, seeded: result.seeded };
  },
});

export const upsertCampaignLeagueOnSettleInternal = internalMutation({
  args: {
    campaignId: v.string(),
    partnerId: v.number(),
    uid: v.string(),
    score: v.number(),
    rank: v.optional(v.number()),
    isPassed: v.optional(v.boolean()),
    mode: modeValidator,
    dueTime: v.number(),
    startsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await upsertCampaignLeagueHumanEntry(ctx, {
      campaignId: args.campaignId,
      partnerId: args.partnerId,
      uid: args.uid,
      score: args.score,
      rank: args.rank,
      isPassed: args.isPassed,
      mode: args.mode,
      dueTime: args.dueTime,
      startsAt: args.startsAt,
    });
    return { ok: true as const };
  },
});
