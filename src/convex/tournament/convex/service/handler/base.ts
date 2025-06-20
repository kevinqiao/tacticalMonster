import { deductEntryFee, deductProps, validateLimits } from "../ruleEngine";
import { getTorontoDate } from "../utils";

export interface TournamentHandler {
  validateJoin(ctx: any, args: JoinArgs): Promise<void>;
  join(ctx: any, args: JoinArgs): Promise<JoinResult>;
  validateScore(ctx: any, args: SubmitScoreArgs): Promise<void>;
  submitScore(ctx: any, args: SubmitScoreArgs): Promise<SubmitScoreResult>;
  settle(ctx: any, tournamentId: string): Promise<void>;
}

interface JoinArgs {
  uid: string;
  gameType: string;
  tournamentType: string;
  player: any;
  season: any;
}

interface JoinResult {
  tournamentId: string;
  attemptNumber: number;
}

interface SubmitScoreArgs {
  tournamentId: string;
  uid: string;
  gameType: string;
  score: number;
  gameData: any;
  propsUsed: string[];
}

interface SubmitScoreResult {
  success: boolean;
  attemptNumber: number;
}

export const baseHandler: TournamentHandler = {
  async validateJoin(ctx, { uid, gameType, tournamentType, player }) {
    const tournamentTypeConfig = await ctx.db
      .query("tournament_types")
      .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
      .first();
    if (!tournamentTypeConfig) throw new Error("未知锦标赛类型");

    await validateLimits(ctx, {
      uid,
      gameType,
      tournamentType,
      isSubscribed: player.isSubscribed,
      limits: tournamentTypeConfig.defaultConfig.limits,
    });
  },

  async join(ctx, { uid, gameType, tournamentType, player, season }) {
    const now = getTorontoDate();
    const tournamentTypeConfig = await ctx.db
      .query("tournament_types")
      .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
      .first();
    const config = tournamentTypeConfig.defaultConfig;

    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();
    if (config.entryFee) {
      await deductEntryFee(ctx, { uid, gameType, tournamentType, entryFee: config.entryFee, inventory });
    }

    const attempts = await getPlayerAttempts(ctx, { uid, tournamentId: "", gameType });
    if (config.rules.maxAttempts && attempts >= config.rules.maxAttempts) throw new Error("已达最大尝试次数");

    const tournamentId = await ctx.db.insert("tournaments", {
      seasonId: season._id,
      gameType,
      segmentName: player.segmentName,
      status: "open",
      playerUids: [uid],
      tournamentType,
      isSubscribedRequired: config.isSubscribedRequired || false,
      isSingleMatch: config.rules.isSingleMatch || false,
      prizePool: config.entryFee?.coins ? config.entryFee.coins * 0.8 : 0,
      config,
      createdAt: now.iso,
      updatedAt: now.iso,
      endTime: new Date(now.localDate.getTime() + (config.duration || 24 * 60 * 60 * 1000)).toISOString(),
    });

    await ctx.db.insert("matches", {
      tournamentId,
      gameType,
      uid,
      score: 0,
      completed: false,
      attemptNumber: attempts + 1,
      propsUsed: [],
      gameData: {},
      createdAt: now.iso,
      updatedAt: now.iso,
    });

    return { tournamentId, attemptNumber: attempts + 1 };
  },

  async validateScore(ctx, { tournamentId, gameType, score, gameData, propsUsed }) {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) throw new Error("无效锦标赛");
    if (propsUsed.length > 3) throw new Error("道具使用超限");
    if (gameType === "solitaire") {
      const expectedScore =
        gameData.moves * tournament.config.scoring.move +
        (gameData.timeTaken < tournament.config.scoring.timeLimit ? tournament.config.scoring.completionBonus : 0);
      if (Math.abs(score - expectedScore) > 10) throw new Error("得分不匹配");
    }
  },

  async submitScore(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed }) {
    const now = getTorontoDate();
    const tournament = await ctx.db.get(tournamentId);
    const inventory = await ctx.db.query("player_inventory").withIndex("by_uid", (q: any) => q.eq("uid", uid)).first();
    await deductProps(ctx, { uid, gameType, propsUsed, inventory });

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId).eq("uid", uid))
      .collect();
    const currentAttempt = matches.find((m: any) => !m.completed);
    if (!currentAttempt) throw new Error("未找到未完成尝试");

    await ctx.db.patch(currentAttempt._id, {
      score,
      completed: true,
      gameData,
      propsUsed,
      updatedAt: now.iso,
    });
    return { success: true, attemptNumber: currentAttempt.attemptNumber };
  },

  async settle(ctx, tournamentId) {
    // 空实现，由具体 handler 覆盖
  },
};

async function getPlayerAttempts(ctx: any, { uid, tournamentId, gameType }: { uid: string, tournamentId: string, gameType: string }) {
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId).eq("uid", uid))
    .filter((q: any) => q.eq(q.field("gameType"), gameType))
    .collect();
  return matches.length;
}