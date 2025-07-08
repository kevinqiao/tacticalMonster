import { internal } from "../../../_generated/api";
import { Doc } from "../../../_generated/dataModel";
import { getTorontoDate } from "../../utils";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";

// ==================== 接口定义 ====================

export interface TournamentHandler {
  validateJoin(ctx: any, args: JoinArgs): Promise<void>;
  join(ctx: any, args: JoinArgs): Promise<JoinResult>;
  validateScore(ctx: any, args: SubmitScoreArgs): Promise<void>;
  submitScore(ctx: any, args: SubmitScoreArgs): Promise<SubmitScoreResult>;
  settle(ctx: any, tournamentId: string): Promise<void>;
  distributeRewards?(ctx: any, data: DistributeRewardsArgs): Promise<void>;

  // 锦标赛查找和创建
  findOrCreateTournament?(ctx: any, params: TournamentCreationParams): Promise<any>;

  // 时间范围处理
  getTimeRangeForTournament?(tournamentType: string): "daily" | "weekly" | "seasonal" | "total";
  getTimeIdentifier?(now: any, tournamentType: string): string;

  // 比赛处理
  handleSingleMatchTournament?(ctx: any, params: SingleMatchParams): Promise<JoinResult>;
  handleMultiMatchTournament?(ctx: any, params: MultiMatchParams): Promise<JoinResult>;

  // 分数提交处理
  prepareScoreSubmission?(ctx: any, params: any): Promise<any>;
  handlePropDeduction?(ctx: any, params: any): Promise<any>;
  handleTournamentSettlement?(ctx: any, params: any): Promise<any>;
  logPropUsageIfNeeded?(ctx: any, params: any): Promise<void>;
  buildSubmitScoreResult?(params: any): any;
  handleScoreSubmissionError?(ctx: any, params: any): Promise<void>;

  // 结算处理
  validateTournamentForSettlement?(ctx: any, tournamentId: string): Promise<any>;
  getCompletedMatches?(ctx: any, tournamentId: string): Promise<any[]>;
  distributeRewardsToPlayers?(ctx: any, params: any): Promise<void>;
  logRewardDistributionError?(ctx: any, params: any): Promise<void>;
  completeTournament?(ctx: any, tournamentId: string, now: any): Promise<void>;
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

export interface TournamentCreationParams {
  uid: string;
  gameType: string;
  tournamentType: string;
  player: any;
  season: any;
  config: any;
  now: any;
  timeIdentifier?: string;
}

export interface SingleMatchParams {
  tournamentId: string;
  uid: string;
  gameType: string;
  player: any;
  config: any;
  attemptNumber: number;
  timeIdentifier?: string;
}

export interface MultiMatchParams {
  tournamentId: string;
  uid: string;
  gameType: string;
  player: any;
  config: any;
  attemptNumber: number;
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

  // 使用player_tournaments表查询玩家参与的锦标赛
  const playerTournaments = await ctx.db
    .query("player_tournaments")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
    .collect();

  // 获取对应的锦标赛信息并过滤
  const tournamentIds = playerTournaments.map((pt: any) => pt.tournamentId);

  if (tournamentIds.length === 0) {
    return 0;
  }

  const tournaments = await ctx.db
    .query("tournaments")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("tournamentType"), tournamentType),
        q.eq(q.field("gameType"), gameType),
        q.oneOf(q.field("_id"), tournamentIds)
      )
    )
    .collect();

  // 根据时间范围过滤
  const filteredTournaments = tournaments.filter((tournament: any) => {
    const createdAt = tournament.createdAt;
    if (!createdAt) return false;

    // 将 createdAt 转换为字符串进行比较
    const createdAtStr = typeof createdAt === 'string' ? createdAt : createdAt.toISOString();

    switch (timeRange) {
      case "daily":
        const today = now.localDate.toISOString().split("T")[0];
        return createdAtStr.startsWith(today);
      case "weekly":
        const weekStart = getWeekStart(now.localDate.toISOString().split("T")[0]);
        const tournamentWeekStart = getWeekStart(createdAtStr.split("T")[0]);
        return tournamentWeekStart === weekStart;
      case "seasonal":
        return createdAtStr >= startTime;
      case "total":
      default:
        return true;
    }
  });

  return filteredTournaments.length;
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

/**
 * 创建锦标赛
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
  const entryRequirements = config.entryRequirements;
  const matchRules = config.matchRules;
  const schedule = config.schedule;

  const tournamentId = await ctx.db.insert("tournaments", {
    seasonId: season._id,
    gameType,
    segmentName: player.segmentName,
    status: "open",
    tournamentType,
    isSubscribedRequired: entryRequirements?.isSubscribedRequired || false,
    isSingleMatch: matchRules?.isSingleMatch || false,
    prizePool: entryRequirements?.entryFee?.coins ? entryRequirements.entryFee.coins * 0.8 : 0,
    config,
    createdAt: now.iso,
    updatedAt: now.iso,
    endTime: new Date(now.localDate.getTime() + (schedule?.duration || 24 * 60 * 60 * 1000)).toISOString(),
  });

  // 创建玩家参与关系
  await ctx.db.insert("player_tournaments", {
    uid,
    tournamentId,
    joinedAt: now.iso,
    createdAt: now.iso,
    updatedAt: now.iso,
  });

  return tournamentId;
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
  const entryRequirements = config.entryRequirements;
  const matchRules = config.matchRules;
  const schedule = config.schedule;

  const tournamentId = await ctx.db.insert("tournaments", {
    seasonId: season._id,
    gameType,
    segmentName: player.segmentName,
    status: "open",
    tournamentType,
    isSubscribedRequired: entryRequirements?.isSubscribedRequired || false,
    isSingleMatch: matchRules?.isSingleMatch || false,
    prizePool: entryRequirements?.entryFee?.coins ? entryRequirements.entryFee.coins * 0.8 : 0,
    config: {
      ...config,
      attemptNumber,
      independent: true
    },
    createdAt: now.iso,
    updatedAt: now.iso,
    endTime: new Date(now.localDate.getTime() + (schedule?.duration || 24 * 60 * 60 * 1000)).toISOString(),
  });

  // 创建玩家参与关系
  await ctx.db.insert("player_tournaments", {
    uid,
    tournamentId,
    joinedAt: now.iso,
    createdAt: now.iso,
    updatedAt: now.iso,
  });

  return tournamentId;
}

/**
 * 验证加入条件
 */
export async function validateJoinConditions(ctx: any, { uid, gameType, tournamentType, player, season }: JoinArgs) {
  // 验证玩家存在
  if (!player) {
    throw new Error("玩家不存在");
  }

  // 验证赛季存在
  if (!season) {
    throw new Error("赛季不存在");
  }

  // 验证锦标赛类型存在
  const tournamentTypeConfig = await ctx.db
    .query("tournament_types")
    .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
    .first();

  if (!tournamentTypeConfig) {
    throw new Error("锦标赛类型不存在");
  }

  return tournamentTypeConfig;
}

/**
 * 验证分数提交
 */
export async function validateScoreSubmission(ctx: any, { tournamentId, gameType, score, gameData, propsUsed }: SubmitScoreArgs) {
  if (score < 0) {
    throw new Error("分数不能为负数");
  }

  if (!gameData) {
    throw new Error("游戏数据不能为空");
  }

  // 验证锦标赛存在
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) {
    throw new Error("锦标赛不存在");
  }

  return tournament;
}

/**
 * 计算玩家排名
 */
export async function calculatePlayerRankings(ctx: any, tournamentId: string) {
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
    .collect();

  const playerScores = new Map<string, { totalScore: number; matchCount: number; bestScore: number }>();

  for (const match of matches) {
    const playerMatches = await ctx.db
      .query("player_matches")
      .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
      .collect();

    for (const playerMatch of playerMatches) {
      if (!playerMatch.completed) continue;

      const current = playerScores.get(playerMatch.uid) || {
        totalScore: 0,
        matchCount: 0,
        bestScore: 0
      };

      playerScores.set(playerMatch.uid, {
        totalScore: current.totalScore + playerMatch.score,
        matchCount: current.matchCount + 1,
        bestScore: Math.max(current.bestScore, playerMatch.score)
      });
    }
  }

  return Array.from(playerScores.entries())
    .map(([uid, stats]) => ({
      uid,
      totalScore: stats.totalScore,
      matchCount: stats.matchCount,
      bestScore: stats.bestScore,
      averageScore: stats.totalScore / stats.matchCount
    }))
    .sort((a: any, b: any) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.averageScore - a.averageScore;
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));
}

/**
 * 判断是否应该立即结算
 */
export async function shouldSettleImmediately(ctx: any, tournament: any, tournamentId: string) {
  if (tournament.config?.matchRules?.isSingleMatch) {
    return true;
  }

  // 检查是否所有比赛都完成
  const allMatches = await ctx.db
    .query("matches")
    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
    .collect();

  if (allMatches.length === 0) {
    return false;
  }

  const completedMatches = allMatches.filter((m: any) => m.status === "completed");
  return completedMatches.length === allMatches.length;
}

/**
 * 获取时间标识符
 */
export function getTimeIdentifier(now: any, tournamentType: string): string {
  if (tournamentType.startsWith("daily_")) {
    return now.localDate.toISOString().split("T")[0];
  } else if (tournamentType.startsWith("weekly_")) {
    return getWeekStart(now.localDate.toISOString().split("T")[0]);
  } else if (tournamentType.startsWith("seasonal_") || tournamentType.startsWith("monthly_")) {
    return "seasonal";
  }
  return "total";
}

/**
 * 获取本周开始日期（周一）
 */
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - (day - 1));
  return date.toISOString().split("T")[0];
}

// ==================== 基础处理器 ====================

export const baseHandler: TournamentHandler = {
  async validateJoin(ctx, args) {
    await validateJoinConditions(ctx, args);
  },

  async join(ctx, { uid, gameType, tournamentType, player, season }) {
    const now = getTorontoDate();

    // 获取配置
    const tournamentTypeConfig = await validateJoinConditions(ctx, { uid, gameType, tournamentType, player, season });

    // 使用新的schema结构
    const entryRequirements = tournamentTypeConfig.entryRequirements;
    const matchRules = tournamentTypeConfig.matchRules;
    const rewards = tournamentTypeConfig.rewards;
    const limits = tournamentTypeConfig.limits;
    const advanced = tournamentTypeConfig.advanced;

    // 验证加入条件
    await this.validateJoin(ctx, { uid, gameType, tournamentType, player, season });

    // 扣除入场费
    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();

    if (entryRequirements?.entryFee) {
      const deductEntryFee = (internal as any)["service/tournament/ruleEngine"].deductEntryFeeMutation;
      await ctx.runMutation(deductEntryFee, {
        uid,
        gameType,
        tournamentType,
        entryFee: entryRequirements.entryFee,
        inventory
      });
    }

    // 检查参赛次数限制
    const attempts = await getPlayerAttempts(ctx, { uid, tournamentType, gameType });
    if (matchRules?.maxAttempts && attempts >= matchRules.maxAttempts) {
      throw new Error("已达最大尝试次数");
    }

    // 查找或创建锦标赛
    let tournament;
    if (this.findOrCreateTournament) {
      tournament = await this.findOrCreateTournament(ctx, {
        uid,
        gameType,
        tournamentType,
        player,
        season,
        config: {
          entryRequirements,
          matchRules,
          rewards,
          limits,
          advanced
        },
        now
      });
    } else {
      // 默认创建独立锦标赛
      const tournamentId = await createIndependentTournament(ctx, {
        uid,
        gameType,
        tournamentType,
        player,
        season,
        config: {
          entryRequirements,
          matchRules,
          rewards,
          limits,
          advanced
        },
        now,
        attemptNumber: attempts + 1
      });
      tournament = await ctx.db.get(tournamentId);
    }

    // 根据配置选择处理方式
    const isSingleMatch = matchRules?.isSingleMatch || false;
    const maxPlayers = matchRules?.maxPlayers || 1;

    if (isSingleMatch || maxPlayers === 1) {
      return await this.handleSingleMatchTournament!(ctx, {
        tournamentId: tournament._id,
        uid,
        gameType,
        player,
        config: {
          entryRequirements,
          matchRules,
          rewards,
          limits,
          advanced
        },
        attemptNumber: attempts + 1
      });
    } else {
      return await this.handleMultiMatchTournament!(ctx, {
        tournamentId: tournament._id,
        uid,
        gameType,
        player,
        config: {
          entryRequirements,
          matchRules,
          rewards,
          limits,
          advanced
        },
        attemptNumber: attempts + 1
      });
    }
  },

  async handleSingleMatchTournament(ctx: any, params: SingleMatchParams) {
    const { tournamentId, uid, gameType, player, config, attemptNumber, timeIdentifier } = params;
    const now = getTorontoDate();
    const matchRules = config.matchRules;

    // 创建单场比赛
    const matchId = await MatchManager.createMatch(ctx, {
      tournamentId,
      gameType,
      matchType: matchRules?.matchType || "single_match",
      maxPlayers: matchRules?.maxPlayers || 1,
      minPlayers: matchRules?.minPlayers || 1,
      gameData: {
        player: {
          uid,
          segmentName: player.segmentName,
          eloScore: player.eloScore || 1000
        },
        attemptNumber,
        timeIdentifier,
        timeLimit: matchRules?.timeLimit
      }
    });

    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
      matchId,
      tournamentId,
      uid,
      gameType
    });

    // 创建远程游戏
    const gameResult = await MatchManager.createRemoteGame(ctx, {
      matchId,
      tournamentId,
      uids: [uid],
      gameType,
      matchType: matchRules?.matchType || "single_match"
    });

    return {
      tournamentId,
      matchId,
      playerMatchId,
      gameId: gameResult.gameId,
      serverUrl: gameResult.serverUrl,
      attemptNumber,
      success: true
    };
  },

  async handleMultiMatchTournament(ctx: any, params: MultiMatchParams) {
    const { tournamentId, uid, gameType, player, config, attemptNumber } = params;

    try {
      // 尝试使用锦标赛匹配服务
      const matchResult = await TournamentMatchingService.joinTournamentMatch(ctx, {
        uid,
        tournamentId,
        gameType,
        player,
        config
      });

      return {
        tournamentId,
        matchId: matchResult.matchId,
        playerMatchId: matchResult.playerMatchId,
        gameId: matchResult.gameId,
        serverUrl: matchResult.serverUrl,
        attemptNumber,
        matchStatus: matchResult.matchInfo,
        success: true
      };
    } catch (error) {
      console.error("多人比赛匹配失败:", error);

      // 回退到单人模式
      console.log("回退到单人比赛模式");
      return await this.handleSingleMatchTournament!(ctx, {
        tournamentId,
        uid,
        gameType,
        player,
        config,
        attemptNumber
      });
    }
  },

  async validateScore(ctx, args) {
    await validateScoreSubmission(ctx, args);
  },

  async submitScore(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId }) {
    const now = getTorontoDate();

    try {
      // 准备分数提交
      const preparedData = await this.prepareScoreSubmission!(ctx, {
        tournamentId,
        uid,
        gameType,
        score,
        gameData,
        propsUsed,
        now
      });

      // 处理道具扣除
      const deductionResult = await this.handlePropDeduction!(ctx, {
        propsUsed,
        gameId,
        uid,
        score,
        gameData,
        now
      });

      // 处理锦标赛结算
      const settleResult = await this.handleTournamentSettlement!(ctx, {
        tournament: preparedData.tournament,
        tournamentId,
        matchId: preparedData.matchId,
        score,
        deductionResult,
        now
      });

      // 记录道具使用
      await this.logPropUsageIfNeeded!(ctx, {
        propsUsed,
        uid,
        tournamentId,
        matchId: preparedData.matchId,
        gameId,
        deductionResult,
        now
      });

      return this.buildSubmitScoreResult!({
        success: true,
        matchId: preparedData.matchId,
        score,
        deductionResult,
        settleResult
      });

    } catch (error) {
      await this.handleScoreSubmissionError!(ctx, {
        propsUsed,
        gameId,
        uid,
        error
      });
      throw error;
    }
  },

  async prepareScoreSubmission(ctx: any, params: {
    tournamentId: string;
    uid: string;
    gameType: string;
    score: number;
    gameData: any;
    propsUsed: string[];
    now: any;
  }) {
    const { tournamentId, uid, gameType, score, gameData, propsUsed, now } = params;

    // 获取锦标赛信息
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw new Error("锦标赛不存在");
    }

    // 验证提交条件
    await this.validateScore(ctx, { tournamentId, gameType, score, gameData, propsUsed, uid });

    // 查找对应的比赛记录
    const playerMatches = await ctx.db
      .query("player_matches")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .collect();

    let match = null;
    for (const playerMatch of playerMatches) {
      const matchData = await ctx.db.get(playerMatch.matchId);
      if (matchData &&
        matchData.tournamentId === tournamentId &&
        matchData.gameType === gameType &&
        matchData.status !== "completed") {
        match = {
          matchId: playerMatch.matchId,
          attemptNumber: playerMatch.attemptNumber
        };
        break;
      }
    }

    if (!match) {
      throw new Error("未找到对应的比赛记录");
    }

    // 提交分数到比赛
    await MatchManager.submitScore(ctx, {
      matchId: match.matchId,
      tournamentId,
      uid,
      gameType,
      score,
      gameData,
      propsUsed,
      attemptNumber: match.attemptNumber
    });

    return {
      tournament,
      matchId: match.matchId,
      attemptNumber: match.attemptNumber
    };
  },

  async handlePropDeduction(ctx: any, params: {
    propsUsed: string[];
    gameId?: string;
    uid: string;
    score: number;
    gameData: any;
    now: any;
  }) {
    const { propsUsed, gameId, uid, score, gameData, now } = params;

    if (propsUsed.length === 0 || !gameId) {
      return null;
    }

    try {
      const unifiedPropManager = (internal as any)["service/prop/unifiedPropManager"];
      const deductionResult = await ctx.runMutation(unifiedPropManager.executeDelayedDeduction, {
        gameId,
        uid,
        gameResult: {
          score,
          gameData,
          propsUsed,
          completed: true
        }
      });
      console.log("延迟扣除执行结果:", deductionResult);
      return deductionResult;
    } catch (error) {
      console.error("执行延迟扣除失败:", error);
      return null;
    }
  },

  async handleTournamentSettlement(ctx: any, params: {
    tournament: any;
    tournamentId: string;
    matchId: string;
    score: number;
    deductionResult: any;
    now: any;
  }) {
    const { tournament, tournamentId, matchId, score, deductionResult, now } = params;

    // 更新锦标赛状态
    await ctx.db.patch(tournament._id, {
      updatedAt: now.iso
    });

    // 检查是否需要结算锦标赛
    if (await shouldSettleImmediately(ctx, tournament, tournamentId)) {
      try {
        console.log(`立即结算锦标赛 ${tournamentId}`);
        await this.settle(ctx, tournamentId);
        return {
          settled: true,
          reason: "锦标赛完成"
        };
      } catch (settleError) {
        console.error("锦标赛结算失败:", settleError);
        return {
          settled: false,
          error: settleError instanceof Error ? settleError.message : "未知错误"
        };
      }
    }

    return {
      settled: false,
      reason: "等待更多比赛完成"
    };
  },

  async logPropUsageIfNeeded(ctx: any, params: {
    propsUsed: string[];
    uid: string;
    tournamentId: string;
    matchId: string;
    gameId?: string;
    deductionResult: any;
    now: any;
  }) {
    const { propsUsed, uid, tournamentId, matchId, gameId, deductionResult, now } = params;

    if (propsUsed.length > 0) {
      await logPropUsage(ctx, {
        uid,
        tournamentId,
        matchId,
        propsUsed,
        gameId,
        deductionResult
      });
    }
  },

  buildSubmitScoreResult(params: {
    success: boolean;
    matchId: string;
    score: number;
    deductionResult: any;
    settleResult: any;
  }) {
    const { success, matchId, score, deductionResult, settleResult } = params;

    return {
      success,
      matchId,
      score,
      deductionResult,
      message: settleResult?.settled ? "分数提交成功，锦标赛已结算" : "分数提交成功",
      settled: settleResult?.settled || false,
      settleReason: settleResult?.reason || settleResult?.error
    };
  },

  async handleScoreSubmissionError(ctx: any, params: {
    propsUsed: string[];
    gameId?: string;
    uid: string;
    error: any;
  }) {
    const { propsUsed, gameId, uid, error } = params;

    console.error("提交分数失败:", error);

    // 如果分数提交失败，取消延迟扣除
    if (propsUsed.length > 0 && gameId) {
      try {
        const unifiedPropManager = (internal as any)["service/prop/unifiedPropManager"];
        await ctx.runMutation(unifiedPropManager.cancelDelayedDeduction, {
          gameId,
          uid,
          reason: "游戏中断"
        });
        console.log("延迟扣除已取消");
      } catch (error) {
        console.error("取消延迟扣除失败:", error);
      }
    }
  },

  async settle(ctx, tournamentId) {
    const now = getTorontoDate();

    // 验证锦标赛
    const tournament = await this.validateTournamentForSettlement!(ctx, tournamentId);

    // 获取完成的比赛
    const completedMatches = await this.getCompletedMatches!(ctx, tournamentId);

    if (completedMatches.length === 0) {
      throw new Error("没有完成的比赛记录");
    }

    // 计算玩家排名
    const sortedPlayers = await calculatePlayerRankings(ctx, tournamentId);

    // 分配奖励
    await this.distributeRewardsToPlayers!(ctx, {
      sortedPlayers,
      tournament,
      matches: completedMatches,
      now
    });

    // 完成锦标赛
    await this.completeTournament!(ctx, tournamentId, now);

    console.log(`锦标赛 ${tournamentId} 结算完成`);
  },

  async validateTournamentForSettlement(ctx: any, tournamentId: string) {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw new Error("锦标赛不存在");
    }

    if (tournament.status !== "open") {
      throw new Error("锦标赛状态不正确");
    }

    return tournament;
  },

  async getCompletedMatches(ctx: any, tournamentId: string) {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
      .collect();

    return matches.filter((m: any) => m.status === "completed");
  },

  async distributeRewardsToPlayers(ctx: any, params: {
    sortedPlayers: any[];
    tournament: any;
    matches: any[];
    now: any;
  }) {
    const { sortedPlayers, tournament, matches, now } = params;

    for (const playerData of sortedPlayers) {
      try {
        if (this.distributeRewards) {
          await this.distributeRewards(ctx, {
            uid: playerData.uid,
            rank: playerData.rank,
            score: playerData.totalScore,
            tournament,
            matches: matches.filter((m: any) =>
              ctx.db.query("player_matches")
                .withIndex("by_match", (q: any) => q.eq("matchId", m._id))
                .filter((q: any) => q.eq(q.field("uid"), playerData.uid))
                .first()
            )
          });
        }
      } catch (error: any) {
        await this.logRewardDistributionError!(ctx, {
          error,
          uid: playerData.uid,
          now
        });
      }
    }
  },

  async logRewardDistributionError(ctx: any, params: {
    error: any;
    uid: string;
    now: any;
  }) {
    const { error, uid, now } = params;

    console.error(`分配奖励失败 (${uid}):`, error);

    // 记录错误日志
    await ctx.db.insert("error_logs", {
      error: `分配奖励失败: ${error.message}`,
      context: "tournament_settle",
      uid,
      createdAt: now.iso
    });
  },

  async completeTournament(ctx: any, tournamentId: string, now: any) {
    await ctx.db.patch(tournamentId, {
      status: "completed",
      updatedAt: now.iso
    });
  },

  getTimeRangeForTournament(tournamentType: string): "daily" | "weekly" | "seasonal" | "total" {
    if (tournamentType.startsWith("daily_")) {
      return "daily";
    } else if (tournamentType.startsWith("weekly_")) {
      return "weekly";
    } else if (tournamentType.startsWith("seasonal_") || tournamentType.startsWith("monthly_")) {
      return "seasonal";
    } else {
      return "total";
    }
  }
};