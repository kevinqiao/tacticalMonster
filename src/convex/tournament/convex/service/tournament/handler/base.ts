import { internal } from "../../../_generated/api";
import { Doc } from "../../../_generated/dataModel";
import { getTournamentConfig } from "../../../data/tournamentConfigs";
import { getTorontoDate } from "../../utils";
import { applyRules, deductEntryFee, validateLimits } from "../ruleEngine";

// ==================== 接口定义 ====================

export interface TournamentHandler {
  validateJoin(ctx: any, args: JoinArgs): Promise<void>;
  join(ctx: any, args: JoinArgs): Promise<JoinResult>;
  validateScore(ctx: any, args: SubmitScoreArgs): Promise<void>;
  submitScore(ctx: any, args: SubmitScoreArgs): Promise<SubmitScoreResult>;
  settle(ctx: any, tournamentId: string): Promise<void>;
  distributeRewards?(ctx: any, data: DistributeRewardsArgs): Promise<void>;
  findOrReuseTournament?(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
  }): Promise<string>;
  getTimeRangeForTournament?(tournamentType: string): "daily" | "weekly" | "seasonal" | "total";
}

export interface JoinArgs {
  uid: string;
  gameType: string;
  tournamentType: string;
  player: Doc<"players">;
  season: Doc<"seasons">;
}

export interface JoinResult {
  tournamentId: string;
  attemptNumber: number;
  matchId?: string;
  playerMatchId?: string;
  gameId?: string;
  serverUrl?: string;
  matchStatus?: any;
  success?: boolean;
}

export interface SubmitScoreArgs {
  tournamentId: string;
  uid: string;
  gameType: string;
  score: number;
  gameData: any;
  propsUsed: string[];
  gameId?: string;
}

export interface SubmitScoreResult {
  success: boolean;
  matchId: string;
  score: number;
  deductionResult?: any;
  message: string;
  settled?: boolean;
  settleReason?: string;
}

export interface DistributeRewardsArgs {
  uid: string;
  rank: number;
  score: number;
  tournament: any;
  matches: any[];
}

// ==================== 工具函数 ====================

/**
 * 获取玩家尝试次数
 */
export async function getPlayerAttempts(ctx: any, { uid, tournamentType, gameType, timeRange }: {
  uid: string;
  tournamentType: string;
  gameType: string;
  timeRange?: "daily" | "weekly" | "seasonal" | "total";
}) {
  const now = getTorontoDate();
  let startTime: string;

  // 根据时间范围确定开始时间
  switch (timeRange) {
    case "daily":
      startTime = now.localDate.toISOString().split("T")[0] + "T00:00:00.000Z";
      break;
    case "weekly":
      const weekStart = new Date(now.localDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      startTime = weekStart.toISOString();
      break;
    case "seasonal":
      // 获取当前赛季开始时间
      const season = await ctx.db
        .query("seasons")
        .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
        .first();
      startTime = season?.startDate || now.localDate.toISOString();
      break;
    case "total":
    default:
      startTime = "1970-01-01T00:00:00.000Z"; // 从1970年开始
      break;
  }

  const tournaments = await ctx.db
    .query("tournaments")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("tournamentType"), tournamentType),
        q.eq(q.field("gameType"), gameType),
        q.includes(q.field("playerUids"), uid),
        q.gte(q.field("createdAt"), startTime)
      )
    )
    .collect();

  return tournaments.length;
}

/**
 * 更新锦标赛状态
 */
export async function updateTournamentStatus(ctx: any, tournament: any, score: number) {
  const now = getTorontoDate();
  await ctx.db.patch(tournament._id, {
    updatedAt: now.iso
  });
}

/**
 * 记录道具使用日志
 */
export async function logPropUsage(ctx: any, data: {
  uid: string;
  tournamentId: string;
  matchId: string;
  propsUsed: string[];
  gameId?: string;
  deductionResult?: any;
}) {
  const now = getTorontoDate();

  const logData: any = {
    uid: data.uid,
    gameType: "tournament",
    propType: data.propsUsed.join(","),
    gameState: {
      tournamentId: data.tournamentId,
      matchId: data.matchId,
      gameId: data.gameId
    },
    newGameState: {},
    params: {},
    deductionMode: "delayed",
    gameId: data.gameId,
    createdAt: now.iso
  };

  if (data.deductionResult?.deductionId) {
    logData.deductionId = data.deductionResult.deductionId;
  }

  await ctx.db.insert("prop_usage_logs", logData);
}

// ==================== 锦标赛创建函数 ====================

/**
 * 创建普通锦标赛
 */
export async function createTournament(ctx: any, { uid, gameType, tournamentType, player, season, config, now }: {
  uid: string;
  gameType: string;
  tournamentType: string;
  player: any;
  season: any;
  config: any;
  now: any;
}) {
  return await ctx.db.insert("tournaments", {
    seasonId: season._id,
    gameType,
    segmentName: player.segmentName,
    status: "open",
    playerUids: [uid],
    tournamentType,
    isSubscribedRequired: config.isSubscribedRequired || false,
    isSingleMatch: config.rules?.isSingleMatch || false,
    prizePool: config.entryFee?.coins ? config.entryFee.coins * 0.8 : 0,
    config,
    createdAt: now.iso,
    updatedAt: now.iso,
    endTime: new Date(now.localDate.getTime() + (config.duration || 24 * 60 * 60 * 1000)).toISOString(),
  });
}

/**
 * 创建独立锦标赛
 */
export async function createIndependentTournament(ctx: any, { uid, gameType, tournamentType, player, season, config, now, attemptNumber }: {
  uid: string;
  gameType: string;
  tournamentType: string;
  player: any;
  season: any;
  config: any;
  now: any;
  attemptNumber: number;
}) {
  const today = now.localDate.toISOString().split("T")[0];

  return await ctx.db.insert("tournaments", {
    seasonId: season._id,
    gameType,
    segmentName: player.segmentName,
    status: "open",
    playerUids: [uid],
    tournamentType,
    tournamentId: `${tournamentType}_${uid}_${today}_${attemptNumber}`,
    isSubscribedRequired: config.isSubscribedRequired || false,
    isSingleMatch: true,
    prizePool: config.entryFee?.coins ? config.entryFee.coins * 0.8 : 0,
    config: {
      ...config,
      attemptNumber,
      isIndependent: true
    },
    createdAt: now.iso,
    updatedAt: now.iso,
    endTime: new Date(now.localDate.getTime() + (config.duration || 24 * 60 * 60 * 1000)).toISOString(),
  });
}

// ==================== 验证函数 ====================

/**
 * 验证加入条件
 */
export async function validateJoinConditions(ctx: any, { uid, gameType, tournamentType, player, season }: JoinArgs) {
  const config = getTournamentConfig(tournamentType);
  if (!config) {
    throw new Error(`无效的锦标赛配置: ${tournamentType}`);
  }

  if (config.limits) {
    await validateLimits(ctx, {
      uid,
      gameType,
      tournamentType,
      isSubscribed: player.isSubscribed,
      limits: config.limits,
      seasonId: season._id,
    });
  }
}

/**
 * 验证分数
 */
export async function validateScoreSubmission(ctx: any, { tournamentId, gameType, score, gameData, propsUsed }: SubmitScoreArgs) {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) throw new Error("无效锦标赛");
  if (propsUsed.length > 3) throw new Error("道具使用超限");

  if (gameType === "solitaire") {
    if (!tournament.config || !tournament.config.scoring) {
      console.warn("锦标赛配置中缺少 scoring 配置，跳过分数验证");
      return;
    }
    const scoring = tournament.config.scoring;
    const expectedScore =
      (gameData?.moves || 0) * (scoring.move || 0) +
      ((gameData?.timeTaken ?? Infinity) < (scoring.timeLimit || Infinity) ? (scoring.completionBonus || 0) : 0);
    if (Math.abs(score - expectedScore) > 10) throw new Error("得分不匹配");
  }
}

// ==================== 结算函数 ====================

/**
 * 计算玩家排名
 */
export async function calculatePlayerRankings(ctx: any, tournamentId: string) {
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
    .filter((q: any) => q.eq(q.field("completed"), true))
    .collect();

  if (matches.length === 0) {
    throw new Error("没有完成的比赛记录");
  }

  const playerScores = new Map<string, number>();
  for (const match of matches) {
    const currentScore = playerScores.get(match.uid) || 0;
    playerScores.set(match.uid, Math.max(currentScore, match.score));
  }

  return Array.from(playerScores.entries())
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([uid, score], index) => ({
      uid,
      score,
      rank: index + 1
    }));
}

/**
 * 检查是否需要立即结算
 */
export async function shouldSettleImmediately(ctx: any, tournament: any, tournamentId: string) {
  // 检查是否为单人锦标赛
  if (tournament.isSingleMatch || tournament.config?.rules?.isSingleMatch) {
    return { shouldSettle: true, reason: "单人锦标赛，玩家完成比赛" };
  }

  // 检查是否为独立锦标赛
  if (tournament.config?.isIndependent) {
    return { shouldSettle: true, reason: "独立锦标赛，玩家完成比赛" };
  }

  // 检查是否所有玩家都已完成
  if (tournament.playerUids && tournament.playerUids.length > 0) {
    const completedCount = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
      .filter((q: any) => q.eq(q.field("completed"), true))
      .collect()
      .then((matches: any) => {
        const uniqueCompletedPlayers = new Set(matches.map((m: any) => m.uid));
        return uniqueCompletedPlayers.size;
      });

    if (completedCount >= tournament.playerUids.length) {
      return { shouldSettle: true, reason: "所有玩家都已完成比赛" };
    }
  }

  return { shouldSettle: false, reason: "" };
}

// ==================== 基础处理器 ====================

export const baseHandler: TournamentHandler = {
  /**
   * 验证加入条件
   */
  async validateJoin(ctx, args) {
    await validateJoinConditions(ctx, args);
  },

  /**
   * 加入锦标赛 - 可重写的核心方法
   */
  async join(ctx, { uid, gameType, tournamentType, player, season }) {
    const now = getTorontoDate();
    const today = now.localDate.toISOString().split("T")[0];

    // 获取配置
    const tournamentTypeConfig = await ctx.db
      .query("tournament_types")
      .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
      .first();
    const config = tournamentTypeConfig?.defaultConfig || {};

    // 验证加入条件
    await this.validateJoin(ctx, { uid, gameType, tournamentType, player, season });

    // 扣除入场费
    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();
    if (config.entryFee) {
      await deductEntryFee(ctx, { uid, gameType, tournamentType, entryFee: config.entryFee, inventory });
    }

    // 检查参赛次数限制
    const timeRange = (this.getTimeRangeForTournament || baseHandler.getTimeRangeForTournament)!(tournamentType);
    const attempts = await getPlayerAttempts(ctx, { uid, tournamentType, gameType, timeRange });
    if (config.rules?.maxAttempts && attempts >= config.rules.maxAttempts) {
      throw new Error(`已达${timeRange === 'daily' ? '今日' : timeRange === 'weekly' ? '本周' : timeRange === 'seasonal' ? '本赛季' : ''}最大尝试次数`);
    }

    // 确定锦标赛创建策略
    const attemptNumber = attempts + 1;
    let tournamentId;

    if (config.rules?.independentAttempts) {
      // 每次尝试都创建独立的锦标赛
      tournamentId = await createIndependentTournament(ctx, {
        uid, gameType, tournamentType, player, season, config, now, attemptNumber
      });
    } else if (config.rules?.allowReuse) {
      // 复用现有锦标赛（多人共享）
      tournamentId = await (this.findOrReuseTournament || baseHandler.findOrReuseTournament)!(ctx, { uid, gameType, tournamentType, player, season, config, now });
    } else {
      // 总是创建新锦标赛
      tournamentId = await createTournament(ctx, { uid, gameType, tournamentType, player, season, config, now });
    }

    // 创建初始match记录
    if (config.rules?.createInitialMatch !== false) {
      await ctx.db.insert("matches", {
        tournamentId,
        gameType,
        uid,
        score: 0,
        completed: false,
        attemptNumber,
        propsUsed: [],
        gameData: {},
        createdAt: now.iso,
        updatedAt: now.iso,
      });
    }

    return { tournamentId, attemptNumber };
  },

  /**
   * 查找或复用锦标赛 - 可重写的方法
   */
  async findOrReuseTournament(ctx: any, { uid, gameType, tournamentType, player, season, config, now }: {
    uid: string;
    gameType: string;
    tournamentType: string;
    player: any;
    season: any;
    config: any;
    now: any;
  }): Promise<string> {
    const existingTournament = await ctx.db
      .query("tournaments")
      .filter((q: any) =>
        q.and(
          q.eq(q.field("tournamentType"), tournamentType),
          q.eq(q.field("gameType"), gameType),
          q.eq(q.field("status"), "open")
        )
      )
      .first();

    if (existingTournament) {
      if (existingTournament.playerUids.includes(uid)) {
        const playerMatches = await ctx.db
          .query("matches")
          .withIndex("by_tournament_uid", (q: any) =>
            q.eq("tournamentId", existingTournament._id).eq("uid", uid)
          )
          .filter((q: any) => q.eq(q.field("completed"), true))
          .collect();

        const maxSubmissionsPerTournament = config.rules?.maxSubmissionsPerTournament || 1;

        if (maxSubmissionsPerTournament === 1 && playerMatches.length >= 1) {
          throw new Error("您已参与该锦标赛，不能重复提交分数");
        } else if (maxSubmissionsPerTournament > 1 && playerMatches.length >= maxSubmissionsPerTournament) {
          throw new Error(`在该锦标赛中最多只能提交${maxSubmissionsPerTournament}次分数`);
        }
      }

      if (!existingTournament.playerUids.includes(uid)) {
        await ctx.db.patch(existingTournament._id, {
          playerUids: [...existingTournament.playerUids, uid]
        });
      }

      return existingTournament._id;
    } else {
      return await createTournament(ctx, { uid, gameType, tournamentType, player, season, config, now });
    }
  },

  /**
   * 验证分数提交
   */
  async validateScore(ctx, args) {
    await validateScoreSubmission(ctx, args);
  },

  /**
   * 提交分数 - 可重写的核心方法
   */
  async submitScore(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId }) {
    const now = getTorontoDate();

    try {
      // 获取锦标赛信息
      const tournament = await ctx.db.get(tournamentId);
      if (!tournament) {
        throw new Error("锦标赛不存在");
      }

      // 验证提交条件
      await this.validateScore(ctx, { tournamentId, gameType, score, gameData, propsUsed, uid });

      // 创建比赛记录
      const matchId = await ctx.db.insert("matches", {
        tournamentId,
        gameType,
        uid,
        score,
        completed: true,
        attemptNumber: 1,
        propsUsed,
        gameData,
        createdAt: now.iso,
        updatedAt: now.iso
      });

      // 执行延迟扣除
      let deductionResult = null;
      if (propsUsed.length > 0 && gameId) {
        try {
          const unifiedPropManager = (internal as any)["service/prop/unifiedPropManager"];
          deductionResult = await ctx.runMutation(unifiedPropManager.executeDelayedDeduction, {
            gameId,
            uid,
            gameResult: { score, gameData, propsUsed, completed: true }
          });
        } catch (error) {
          console.error("执行延迟扣除失败:", error);
        }
      }

      // 更新锦标赛状态
      await updateTournamentStatus(ctx, tournament, score);

      // 检查是否需要立即结算
      const { shouldSettle, reason } = await shouldSettleImmediately(ctx, tournament, tournamentId);

      if (shouldSettle) {
        try {
          console.log(`立即结算锦标赛 ${tournamentId}: ${reason}`);
          await this.settle(ctx, tournamentId);

          return {
            success: true,
            matchId,
            score,
            deductionResult,
            settled: true,
            settleReason: reason,
            message: "分数提交成功，锦标赛已结算"
          };
        } catch (settleError) {
          console.error("立即结算失败:", settleError);
        }
      }

      // 记录道具使用日志
      if (propsUsed.length > 0) {
        await logPropUsage(ctx, {
          uid, tournamentId, matchId, propsUsed, gameId, deductionResult
        });
      }

      return {
        success: true,
        matchId,
        score,
        deductionResult,
        settled: false,
        message: "分数提交成功"
      };

    } catch (error) {
      console.error("提交分数失败:", error);

      // 取消延迟扣除
      if (propsUsed.length > 0 && gameId) {
        try {
          const unifiedPropManager = (internal as any)["service/prop/unifiedPropManager"];
          await ctx.runMutation(unifiedPropManager.cancelDelayedDeduction, {
            gameId, uid, reason: "游戏中断"
          });
        } catch (error) {
          console.error("取消延迟扣除失败:", error);
        }
      }

      throw error;
    }
  },

  /**
   * 结算锦标赛 - 可重写的核心方法
   */
  async settle(ctx, tournamentId) {
    const now = getTorontoDate();

    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw new Error("锦标赛不存在");
    }

    // 计算排名
    const sortedPlayers = await calculatePlayerRankings(ctx, tournamentId);

    // 获取所有完成的比赛记录
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
      .filter((q: any) => q.eq(q.field("completed"), true))
      .collect();

    // 分配奖励
    for (const playerData of sortedPlayers) {
      try {
        await (this.distributeRewards || baseHandler.distributeRewards)!(ctx, {
          uid: playerData.uid,
          rank: playerData.rank,
          score: playerData.score,
          tournament,
          matches: matches.filter((m: any) => m.uid === playerData.uid)
        });
      } catch (error: any) {
        console.error(`分配奖励失败 (${playerData.uid}):`, error);
        await ctx.db.insert("error_logs", {
          error: `分配奖励失败: ${error.message}`,
          context: "tournament_settle",
          uid: playerData.uid,
          createdAt: now.iso
        });
      }
    }

    // 更新锦标赛状态
    await ctx.db.patch(tournamentId, {
      status: "completed",
      updatedAt: now.iso
    });
  },

  /**
   * 分配奖励 - 可重写的方法
   */
  async distributeRewards(ctx, { uid, rank, score, tournament, matches }) {
    const now = getTorontoDate();

    const player = await ctx.db
      .query("players")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();

    if (!player) {
      throw new Error(`玩家 ${uid} 不存在`);
    }

    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();

    if (!inventory) {
      throw new Error(`玩家 ${uid} 库存不存在`);
    }

    const playerSeason = await ctx.db
      .query("player_seasons")
      .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", tournament.seasonId))
      .first();

    if (!playerSeason) {
      throw new Error(`玩家 ${uid} 赛季信息不存在`);
    }

    // 使用ruleEngine处理奖励分配
    const { finalReward } = await applyRules(ctx, {
      tournament, uid, matches, player, inventory, playerSeason
    });

    // 记录奖励分配
    await ctx.db.insert("tournament_rewards", {
      uid,
      tournamentId: tournament._id,
      rank,
      score,
      rewards: finalReward,
      createdAt: now.iso
    });

    // 发送通知
    const propMessage = finalReward.props && finalReward.props.length > 0
      ? `，${finalReward.props.length}个道具`
      : '';
    const ticketMessage = finalReward.tickets && finalReward.tickets.length > 0
      ? `，${finalReward.tickets.length}张门票`
      : '';

    await ctx.db.insert("notifications", {
      uid,
      message: `您在${tournament.tournamentType}锦标赛中排名第${rank}，获得${finalReward.coins}金币、${finalReward.gamePoints}积分${propMessage}${ticketMessage}！`,
      createdAt: now.iso
    });
  },

  /**
   * 获取锦标赛时间范围
   */
  getTimeRangeForTournament(tournamentType: string): "daily" | "weekly" | "seasonal" | "total" {
    // 根据锦标赛类型确定时间范围
    if (tournamentType.startsWith("daily_")) {
      return "daily";
    } else if (tournamentType.startsWith("weekly_")) {
      return "weekly";
    } else if (tournamentType.startsWith("seasonal_") || tournamentType.startsWith("monthly_")) {
      return "seasonal";
    } else {
      // 默认返回total，适用于独立锦标赛等
      return "total";
    }
  }
};