// @ts-nocheck
import { getTorontoDate } from "../../utils";
import { baseHandler, TournamentHandler } from "./base";

// 每日特殊赛处理器
export const dailySpecialHandler: TournamentHandler = {
  ...baseHandler,

  async validateJoin(ctx, { uid, gameType, player, season }) {
    const now = getTorontoDate();
    const today = now.localDate.toISOString().split("T")[0];

    // 检查玩家库存
    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q) => q.eq("uid", uid))
      .first();

    if (!inventory) {
      throw new Error("玩家库存不存在");
    }

    // 检查参赛费用
    const entryFee = { coins: 50 }; // 每日特殊赛固定费用
    if (inventory.coins < entryFee.coins) {
      throw new Error("金币不足");
    }

    // 检查参赛次数限制
    const limits = await ctx.db
      .query("player_tournament_limits")
      .withIndex("by_uid_game_date", (q) =>
        q.eq("uid", uid).eq("gameType", gameType).eq("date", today)
      )
      .collect();

    const dailyLimit = limits.find(l => l.tournamentType === "daily_special");
    const maxAttempts = 3; // 每日特殊赛最多3次

    if (dailyLimit && dailyLimit.participationCount >= maxAttempts) {
      throw new Error("今日参赛次数已达上限");
    }
  },

  async validateScore(ctx, { tournamentId, uid, score }) {
    // 基础验证
    await baseHandler.validateScore(ctx, { tournamentId, uid, gameType: "solitaire", score, gameData: {}, propsUsed: [] });

    // 每日特殊赛特定验证
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw new Error("锦标赛不存在");
    }

    // 检查是否已提交过分数
    const existingMatch = await ctx.db
      .query("matches")
      .withIndex("by_tournament_uid", (q) =>
        q.eq("tournamentId", tournamentId).eq("uid", uid)
      )
      .filter((q) => q.eq(q.field("completed"), true))
      .first();

    if (existingMatch) {
      throw new Error("每日特殊赛只能提交一次分数");
    }

    // 检查分数是否达到阈值
    const config = tournament.config;
    if (score < config.rules.scoreThreshold) {
      throw new Error(`分数未达到阈值 ${config.rules.scoreThreshold}`);
    }
  },

  async settle(ctx, tournamentId) {
    // 使用base.ts的通用settle逻辑
    await baseHandler.settle(ctx, tournamentId);
  }
};