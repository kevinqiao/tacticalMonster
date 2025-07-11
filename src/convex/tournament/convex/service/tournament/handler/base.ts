import { internal } from "../../../_generated/api";
import { getTorontoDate } from "../../utils";
import {
  MultiMatchParams,
  SingleMatchParams,
  TournamentHandler,
  calculatePlayerRankings,
  findOrCreateTournament,
  logPropUsage,
  shouldSettleImmediately,
  validateJoinConditions,
  validateScoreSubmission
} from "../common";
import { MatchManager } from "../matchManager";

// Helper functions to avoid 'this' issues
const prepareScoreSubmission = async (ctx: any, params: {
  tournamentId: string;
  uid: string;
  gameType: string;
  score: number;
  gameData: any;
  propsUsed: string[];
  now: any;
}) => {
  const { tournamentId, uid, gameType, score, gameData, propsUsed, now } = params;

  // 获取玩家的比赛记录
  const playerMatch = await ctx.db
    .query("player_matches")
    .withIndex("by_tournament_uid", (q: any) =>
      q.eq("tournamentId", tournamentId).eq("uid", uid)
    )
    .order("desc")
    .first();

  if (!playerMatch) {
    throw new Error("未找到比赛记录");
  }

  // 验证分数
  if (score < 0) {
    throw new Error("分数不能为负数");
  }

  // 检查是否已经提交过分数
  if (playerMatch.completed) {
    throw new Error("比赛已完成，无法再次提交分数");
  }

  return {
    matchId: playerMatch.matchId,
    playerMatchId: playerMatch._id,
    currentScore: playerMatch.score || 0
  };
};

const handlePropDeduction = async (ctx: any, params: {
  propsUsed: string[];
  gameId?: string;
  uid: string;
  score: number;
  gameData: any;
  now: any;
}) => {
  const { propsUsed, gameId, uid, score, gameData, now } = params;

  if (propsUsed.length === 0) {
    return { success: true, deductedProps: [] };
  }

  try {
    // 使用道具管理器扣除道具
    // TODO: Fix prop manager import
    // const { UnifiedPropManager } = await import("../../prop/unifiedPropManager");
    // const result = await UnifiedPropManager.useProp(ctx, {
    //   mode: "delayed",
    //   gameId,
    //   gameType: "tournament",
    //   uid,
    //   propType: propsUsed[0], // 简化处理，只处理第一个道具
    //   gameState: gameData,
    //   params: {}
    // });

    // 临时简化处理
    return {
      success: true,
      deductedProps: propsUsed,
      deductionId: `temp_${Date.now()}`
    };
  } catch (error) {
    console.error("道具扣除失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "道具扣除失败",
      deductedProps: []
    };
  }
};

const handleTournamentSettlement = async (ctx: any, params: {
  tournament: any;
  tournamentId: string;
  matchId: string;
  score: number;
  deductionResult: any;
  now: any;
}) => {
  const { tournament, tournamentId, matchId, score, deductionResult, now } = params;

  // 检查是否需要立即结算
  const shouldSettle = await shouldSettleImmediately(ctx, tournament, tournamentId);

  if (shouldSettle) {
    // 立即结算锦标赛
    await baseHandler.settle(ctx, tournamentId);
    return {
      settled: true,
      settleReason: "immediate_settlement"
    };
  }

  return {
    settled: false,
    settleReason: "delayed_settlement"
  };
};

const logPropUsageIfNeeded = async (ctx: any, params: {
  propsUsed: string[];
  uid: string;
  tournamentId: string;
  matchId: string;
  gameId?: string;
  deductionResult: any;
  now: any;
}) => {
  const { propsUsed, uid, tournamentId, matchId, gameId, deductionResult, now } = params;

  if (propsUsed.length === 0) {
    return;
  }

  await logPropUsage(ctx, {
    uid,
    tournamentId,
    matchId,
    propsUsed,
    gameId,
    deductionResult
  });
};

const buildSubmitScoreResult = (params: {
  success: boolean;
  matchId: string;
  score: number;
  deductionResult: any;
  settleResult: any;
}) => {
  const { success, matchId, score, deductionResult, settleResult } = params;

  return {
    success,
    matchId,
    score,
    deductionResult,
    message: success ? "分数提交成功" : "分数提交失败",
    settled: settleResult?.settled || false,
    settleReason: settleResult?.settleReason
  };
};

// Additional helper functions for settlement
const validateTournamentForSettlement = async (ctx: any, tournamentId: string) => {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) {
    throw new Error("锦标赛不存在");
  }

  if (tournament.status !== "open") {
    throw new Error("锦标赛状态不允许结算");
  }

  return tournament;
};

const getCompletedMatches = async (ctx: any, tournamentId: string) => {
  return await ctx.db
    .query("player_matches")
    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
    .filter((q: any) => q.eq(q.field("completed"), true))
    .collect();
};

const distributeRewardsToPlayers = async (ctx: any, params: {
  sortedPlayers: any[];
  tournament: any;
  matches: any[];
  now: any;
}) => {
  const { sortedPlayers, tournament, matches, now } = params;

  for (const player of sortedPlayers) {
    try {
      // 计算奖励
      const reward = calculateReward(player.rank, tournament.config.rewards);

      // 分配奖励
      await distributeReward(ctx, {
        uid: player.uid,
        rank: player.rank,
        score: player.score,
        tournament,
        matches,
        reward
      });
    } catch (error) {
      await logRewardDistributionError(ctx, {
        error,
        uid: player.uid,
        now
      });
    }
  }
};

const completeTournament = async (ctx: any, tournamentId: string, now: any) => {
  await ctx.db.patch(tournamentId, {
    status: "completed",
    updatedAt: now.iso
  });
};

const calculateReward = (rank: number, rewards: any) => {
  // 根据排名计算奖励
  const rankReward = rewards.rankRewards.find((r: any) =>
    rank >= r.rankRange[0] && rank <= r.rankRange[1]
  );

  return {
    coins: rewards.baseRewards.coins * (rankReward?.multiplier || 1),
    gamePoints: rewards.baseRewards.gamePoints * (rankReward?.multiplier || 1),
    props: [...rewards.baseRewards.props, ...(rankReward?.bonusProps || [])],
    tickets: [...rewards.baseRewards.tickets, ...(rankReward?.bonusTickets || [])]
  };
};

const distributeReward = async (ctx: any, params: {
  uid: string;
  rank: number;
  score: number;
  tournament: any;
  matches: any[];
  reward: any;
}) => {
  const { uid, rank, score, tournament, matches, reward } = params;

  // 更新玩家库存
  const inventory = await ctx.db
    .query("player_inventory")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
    .first();

  if (inventory) {
    await ctx.db.patch(inventory._id, {
      coins: inventory.coins + reward.coins,
      gamePoints: inventory.gamePoints + reward.gamePoints,
      updatedAt: new Date().toISOString()
    });
  }

  // 记录奖励分配
  await ctx.db.insert("reward_distributions", {
    uid,
    tournamentId: tournament._id,
    rank,
    score,
    reward,
    createdAt: new Date().toISOString()
  });
};

const logRewardDistributionError = async (ctx: any, params: {
  error: any;
  uid: string;
  now: any;
}) => {
  const { error, uid, now } = params;

  console.error(`奖励分配失败 (${uid}):`, error);

  await ctx.db.insert("error_logs", {
    error: error instanceof Error ? error.message : "未知错误",
    context: "reward_distribution",
    uid,
    createdAt: now.iso
  });
};

export const baseHandler: TournamentHandler = {
  validateJoin: async (ctx, args) => {
    await validateJoinConditions(ctx, args);
  },

  join: async (ctx, { uid, gameType, tournamentType, player, season }) => {
    const now = getTorontoDate();

    // 获取配置
    const tournamentTypeConfig = await validateJoinConditions(ctx, { uid, gameType, tournamentType, player, season });

    // 使用新的schema结构
    const entryRequirements = tournamentTypeConfig.entryRequirements;
    const matchRules = tournamentTypeConfig.matchRules;
    const rewards = tournamentTypeConfig.rewards;
    const limits = tournamentTypeConfig.limits;
    const advanced = tournamentTypeConfig.advanced;

    // 获取锦标赛的独立状态
    const { getIndependentFromTournamentType } = await import("../utils/tournamentTypeUtils");
    const isIndependent = await getIndependentFromTournamentType(ctx, tournamentType);

    // 验证加入条件
    await validateJoinConditions(ctx, { uid, gameType, tournamentType, player, season });

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
    const timeRange = tournamentTypeConfig?.timeRange || "total";
    const { getPlayerAttempts } = await import("../common");
    const attempts = await getPlayerAttempts(ctx, { uid, tournamentType, gameType, timeRange });
    if (matchRules?.maxAttempts && attempts >= matchRules.maxAttempts) {
      throw new Error("已达最大尝试次数");
    }

    // 查找或创建锦标赛
    const tournament = await findOrCreateTournament(ctx, {
      uid,
      gameType,
      tournamentType,
      player,
      season,
      config: tournamentTypeConfig,
      now,
      isIndependent,
      attemptNumber: attempts + 1
    });

    // 创建比赛
    const matchId = await MatchManager.createMatch(ctx, {
      tournamentId: tournament._id,
      gameType,
      matchType: "tournament",
      maxPlayers: 1,
      minPlayers: 1,
      gameData: { tournamentType, attemptNumber: attempts + 1 }
    });

    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
      matchId,
      tournamentId: tournament._id,
      uid,
      gameType
    });

    const matchResult = {
      matchId,
      playerMatchId,
      gameId: `game_${matchId}`,
      serverUrl: "remote_server_url",
      matchStatus: "pending"
    };

    return {
      tournamentId: tournament._id,
      attemptNumber: attempts + 1,
      matchId: matchResult.matchId,
      playerMatchId: matchResult.playerMatchId,
      gameId: matchResult.gameId,
      serverUrl: matchResult.serverUrl,
      matchStatus: matchResult.matchStatus,
      success: true
    };
  },

  handleSingleMatchTournament: async (ctx: any, params: SingleMatchParams) => {
    const { tournamentId, uid, gameType, player, config, attemptNumber, timeIdentifier } = params;
    const now = getTorontoDate();

    // 创建比赛
    const matchId = await MatchManager.createMatch(ctx, {
      tournamentId,
      gameType,
      matchType: "tournament",
      maxPlayers: 1,
      minPlayers: 1,
      gameData: { tournamentType: config.tournamentType, attemptNumber, timeIdentifier }
    });

    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
      matchId,
      tournamentId,
      uid,
      gameType
    });

    const matchResult = {
      matchId,
      playerMatchId,
      gameId: `game_${matchId}`,
      serverUrl: "remote_server_url",
      matchStatus: "pending"
    };

    return {
      tournamentId,
      attemptNumber,
      matchId: matchResult.matchId,
      playerMatchId: matchResult.playerMatchId,
      gameId: matchResult.gameId,
      serverUrl: matchResult.serverUrl,
      matchStatus: matchResult.matchStatus,
      success: true
    };
  },

  handleMultiMatchTournament: async (ctx: any, params: MultiMatchParams) => {
    const { tournamentId, uid, gameType, player, config, attemptNumber } = params;
    const now = getTorontoDate();

    // 创建比赛
    const matchId = await MatchManager.createMatch(ctx, {
      tournamentId,
      gameType,
      matchType: "tournament",
      maxPlayers: 1,
      minPlayers: 1,
      gameData: { tournamentType: config.tournamentType, attemptNumber }
    });

    // 玩家加入比赛
    const playerMatchId = await MatchManager.joinMatch(ctx, {
      matchId,
      tournamentId,
      uid,
      gameType
    });

    const matchResult = {
      matchId,
      playerMatchId,
      gameId: `game_${matchId}`,
      serverUrl: "remote_server_url",
      matchStatus: "pending"
    };

    return {
      tournamentId,
      attemptNumber,
      matchId: matchResult.matchId,
      playerMatchId: matchResult.playerMatchId,
      gameId: matchResult.gameId,
      serverUrl: matchResult.serverUrl,
      matchStatus: matchResult.matchStatus,
      success: true
    };
  },

  validateScore: async (ctx, args) => {
    await validateScoreSubmission(ctx, args);
  },

  submitScore: async (ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId }) => {
    const now = getTorontoDate();

    // 验证分数提交
    await validateScoreSubmission(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId });

    // 准备分数提交
    const submissionData = await prepareScoreSubmission(ctx, {
      tournamentId,
      uid,
      gameType,
      score,
      gameData,
      propsUsed,
      now
    });

    // 处理道具扣除
    const deductionResult = await handlePropDeduction(ctx, {
      propsUsed,
      gameId,
      uid,
      score,
      gameData,
      now
    });

    // 更新比赛记录
    await MatchManager.submitScore(ctx, {
      matchId: submissionData.matchId,
      tournamentId,
      uid,
      gameType,
      score,
      gameData,
      propsUsed,
      attemptNumber: 1
    });

    // 获取锦标赛信息
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw new Error("锦标赛不存在");
    }

    // 处理锦标赛结算
    const settleResult = await handleTournamentSettlement(ctx, {
      tournament,
      tournamentId,
      matchId: submissionData.matchId,
      score,
      deductionResult,
      now
    });

    // 记录道具使用日志
    await logPropUsageIfNeeded(ctx, {
      propsUsed,
      uid,
      tournamentId,
      matchId: submissionData.matchId,
      gameId,
      deductionResult,
      now
    });

    // 构建返回结果
    return buildSubmitScoreResult({
      success: true,
      matchId: submissionData.matchId,
      score,
      deductionResult,
      settleResult
    });
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

    // 获取玩家的比赛记录
    const playerMatch = await ctx.db
      .query("player_matches")
      .withIndex("by_tournament_uid", (q: any) =>
        q.eq("tournamentId", tournamentId).eq("uid", uid)
      )
      .order("desc")
      .first();

    if (!playerMatch) {
      throw new Error("未找到比赛记录");
    }

    // 验证分数
    if (score < 0) {
      throw new Error("分数不能为负数");
    }

    // 检查是否已经提交过分数
    if (playerMatch.completed) {
      throw new Error("比赛已完成，无法再次提交分数");
    }

    return {
      matchId: playerMatch.matchId,
      playerMatchId: playerMatch._id,
      currentScore: playerMatch.score || 0
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

    if (propsUsed.length === 0) {
      return { success: true, deductedProps: [] };
    }

    try {
      // 使用道具管理器扣除道具
      const { UnifiedPropManager } = await import("../../prop/unifiedPropManager");
      const result = await UnifiedPropManager.useProp(ctx, {
        mode: "delayed",
        gameId,
        gameType: "tournament",
        uid,
        propType: propsUsed[0], // 简化处理，只处理第一个道具
        gameState: gameData,
        params: {}
      });

      return {
        success: result.success,
        deductedProps: propsUsed,
        deductionId: result.deductionMode === "delayed" ? `delayed_${Date.now()}` : null
      };
    } catch (error) {
      console.error("道具扣除失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "道具扣除失败",
        deductedProps: []
      };
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

    // 检查是否需要立即结算
    const shouldSettle = await shouldSettleImmediately(ctx, tournament, tournamentId);

    if (shouldSettle) {
      // 立即结算锦标赛
      await this.settle(ctx, tournamentId);
      return {
        settled: true,
        settleReason: "immediate_settlement"
      };
    }

    return {
      settled: false,
      settleReason: "delayed_settlement"
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

    if (propsUsed.length === 0) {
      return;
    }

    await logPropUsage(ctx, {
      uid,
      tournamentId,
      matchId,
      propsUsed,
      gameId,
      deductionResult
    });
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
      message: success ? "分数提交成功" : "分数提交失败",
      settled: settleResult?.settled || false,
      settleReason: settleResult?.settleReason
    };
  },

  async handleScoreSubmissionError(ctx: any, params: {
    propsUsed: string[];
    gameId?: string;
    uid: string;
    error: any;
  }) {
    const { propsUsed, gameId, uid, error } = params;

    console.error("分数提交失败:", error);

    // 如果有道具使用，尝试回滚道具扣除
    if (propsUsed.length > 0 && gameId) {
      try {
        // 这里可以添加道具回滚逻辑
        console.log("尝试回滚道具扣除");
      } catch (rollbackError) {
        console.error("道具回滚失败:", rollbackError);
      }
    }

    // 记录错误日志
    const now = getTorontoDate();
    await ctx.db.insert("error_logs", {
      error: error instanceof Error ? error.message : "未知错误",
      context: "score_submission",
      uid,
      gameId,
      createdAt: now.iso
    });
  },

  async settle(ctx, tournamentId) {
    const now = getTorontoDate();

    // 验证锦标赛是否可以结算
    const tournament = await validateTournamentForSettlement(ctx, tournamentId);

    // 获取完成的比赛
    const completedMatches = await getCompletedMatches(ctx, tournamentId);

    if (completedMatches.length === 0) {
      throw new Error("没有完成的比赛，无法结算锦标赛");
    }

    // 计算玩家排名
    const sortedPlayers = await calculatePlayerRankings(ctx, tournamentId);

    // 分配奖励
    await distributeRewardsToPlayers(ctx, {
      sortedPlayers,
      tournament,
      matches: completedMatches,
      now
    });

    // 完成锦标赛
    await completeTournament(ctx, tournamentId, now);

    console.log(`锦标赛 ${tournamentId} 结算完成`);
  },


};