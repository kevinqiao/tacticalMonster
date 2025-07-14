import { getTorontoDate } from "../../utils";
import {
  TournamentHandler,
  calculatePlayerRankings,
  getPlayerAttempts,
  logPropUsage,
  shouldSettleImmediately,
  validateScoreSubmission
} from "../common";
import { MatchManager } from "../matchManager";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 分数提交准备数据
 */
interface ScoreSubmissionData {
  matchId: string;
  playerMatchId: string;
  currentScore: number;
}

/**
 * 道具扣除结果
 */
interface PropDeductionResult {
  success: boolean;
  deductedProps: string[];
  deductionId?: string;
  error?: string;
}

/**
 * 锦标赛结算结果
 */
interface SettlementResult {
  settled: boolean;
  settleReason: string;
}

/**
 * 分数提交结果
 */
interface SubmitScoreResult {
  success: boolean;
  matchId: string;
  score: number;
  deductionResult: PropDeductionResult;
  message: string;
  settled: boolean;
  settleReason?: string;
}

// ============================================================================
// 核心业务逻辑函数
// ============================================================================

/**
 * 准备分数提交
 */
async function prepareScoreSubmission(ctx: any, params: {
  tournamentId: string;
  uid: string;
  gameType: string;
  score: number;
  gameData: any;
  propsUsed: string[];
  now: any;
}): Promise<ScoreSubmissionData> {
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
}

/**
 * 处理道具扣除
 */
async function handlePropDeduction(ctx: any, params: {
  propsUsed: string[];
  gameId?: string;
  uid: string;
  score: number;
  gameData: any;
  now: any;
}): Promise<PropDeductionResult> {
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
      deductionId: result.deductionMode === "delayed" ? `delayed_${Date.now()}` : undefined
    };
  } catch (error) {
    console.error("道具扣除失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "道具扣除失败",
      deductedProps: []
    };
  }
}

/**
 * 处理锦标赛结算
 */
async function handleTournamentSettlement(ctx: any, params: {
  tournament: any;
  tournamentId: string;
  matchId: string;
  score: number;
  deductionResult: PropDeductionResult;
  now: any;
  settleFunction: (ctx: any, tournamentId: string) => Promise<void>;
}): Promise<SettlementResult> {
  const { tournament, tournamentId, matchId, score, deductionResult, now, settleFunction } = params;

  // 检查是否需要立即结算
  const shouldSettle = await shouldSettleImmediately(ctx, tournament, tournamentId);

  if (shouldSettle) {
    // 立即结算锦标赛
    await settleFunction(ctx, tournamentId);
    return {
      settled: true,
      settleReason: "immediate_settlement"
    };
  }

  return {
    settled: false,
    settleReason: "delayed_settlement"
  };
}

/**
 * 记录道具使用日志
 */
async function logPropUsageIfNeeded(ctx: any, params: {
  propsUsed: string[];
  uid: string;
  tournamentId: string;
  matchId: string;
  gameId?: string;
  deductionResult: PropDeductionResult;
  now: any;
}): Promise<void> {
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
}

/**
 * 构建分数提交结果
 */
function buildSubmitScoreResult(params: {
  success: boolean;
  matchId: string;
  score: number;
  deductionResult: PropDeductionResult;
  settleResult: SettlementResult;
}): SubmitScoreResult {
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
}

// ============================================================================
// 锦标赛结算相关函数
// ============================================================================

/**
 * 验证锦标赛是否可以结算
 */
async function validateTournamentForSettlement(ctx: any, tournamentId: string) {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) {
    throw new Error("锦标赛不存在");
  }

  if (tournament.status !== "open") {
    throw new Error("锦标赛状态不允许结算");
  }

  return tournament;
}

/**
 * 获取完成的比赛
 */
async function getCompletedMatches(ctx: any, tournamentId: string) {
  return await ctx.db
    .query("player_matches")
    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
    .filter((q: any) => q.eq(q.field("completed"), true))
    .collect();
}

/**
 * 分配奖励给玩家
 */
async function distributeRewardsToPlayers(ctx: any, params: {
  sortedPlayers: any[];
  tournament: any;
  matches: any[];
  now: any;
}): Promise<void> {
  const { sortedPlayers, tournament, matches, now } = params;

  for (const player of sortedPlayers) {
    try {

    } catch (error) {
      await logRewardDistributionError(ctx, {
        error,
        uid: player.uid,
        now
      });
    }
  }
}

/**
 * 完成锦标赛
 */
async function completeTournament(ctx: any, tournamentId: string, now: any): Promise<void> {
  await ctx.db.patch(tournamentId, {
    status: "completed",
    updatedAt: now.iso
  });
}

/**
 * 记录奖励分配错误
 */
async function logRewardDistributionError(ctx: any, params: {
  error: any;
  uid: string;
  now: any;
}): Promise<void> {
  const { error, uid, now } = params;

  console.error(`奖励分配失败 (${uid}):`, error);


}

/**
 * 验证入场费
 * 检查玩家是否满足入场费要求，不进行实际扣除
 */
export async function validateEntryFee(ctx: any, params: {
  uid: string;
  tournamentType: any;
  inventory: any;
}) {
  const { uid, tournamentType, inventory } = params;

  if (!tournamentType.entryRequirements?.entryFee) {
    return; // 没有入场费要求
  }

  const entryFee = tournamentType.entryRequirements.entryFee;

  // 检查金币入场费
  if (entryFee.coins) {
    if (!inventory || inventory.coins < entryFee.coins) {
      throw new Error(`金币不足，需要 ${entryFee.coins} 金币，当前拥有 ${inventory?.coins || 0} 金币`);
    }
  }

  // 检查游戏点数入场费
  if (entryFee.gamePoints) {
    if (!inventory || inventory.gamePoints < entryFee.gamePoints) {
      throw new Error(`游戏点数不足，需要 ${entryFee.gamePoints} 点数，当前拥有 ${inventory?.gamePoints || 0} 点数`);
    }
  }

  // 检查道具入场费
  if (entryFee.props && entryFee.props.length > 0) {
    if (!inventory || !inventory.props) {
      throw new Error(`需要道具入场费，但玩家没有道具库存`);
    }

    for (const requiredProp of entryFee.props) {
      const hasProp = inventory.props.some((prop: any) =>
        prop.id === requiredProp.id || prop.name === requiredProp.name
      );
      if (!hasProp) {
        throw new Error(`缺少必需道具: ${requiredProp.name || requiredProp.id}`);
      }
    }
  }

  // 检查门票入场费
  if (entryFee.tickets && entryFee.tickets.length > 0) {
    if (!inventory || !inventory.tickets) {
      throw new Error(`需要门票入场费，但玩家没有门票库存`);
    }

    for (const requiredTicket of entryFee.tickets) {
      const hasTicket = inventory.tickets.some((ticket: any) =>
        ticket.id === requiredTicket.id || ticket.name === requiredTicket.name
      );
      if (!hasTicket) {
        throw new Error(`缺少必需门票: ${requiredTicket.name || requiredTicket.id}`);
      }
    }
  }
}

/**
 * 扣除入场费
 * 扣除入场费并记录日志
 */
export async function deductEntryFee(ctx: any, params: {
  uid: string;
  tournamentType: any;
  inventory: any;
}) {
  const now = getTorontoDate();
  const { uid, tournamentType, inventory } = params;

  if (!tournamentType.entryRequirements?.entryFee || !inventory) {
    return; // 没有入场费要求或没有库存
  }

  const entryFee = tournamentType.entryRequirements.entryFee;
  const updateData: any = { updatedAt: now.iso };

  // 扣除金币入场费
  if (entryFee.coins) {
    updateData.coins = inventory.coins - entryFee.coins;
  }

  // 扣除游戏点数入场费
  if (entryFee.gamePoints) {
    updateData.gamePoints = inventory.gamePoints - entryFee.gamePoints;
  }

  // 扣除道具入场费
  if (entryFee.props && entryFee.props.length > 0) {
    const updatedProps = [...(inventory.props || [])];
    for (const requiredProp of entryFee.props) {
      const propIndex = updatedProps.findIndex((prop: any) =>
        prop.id === requiredProp.id || prop.name === requiredProp.name
      );
      if (propIndex !== -1) {
        updatedProps.splice(propIndex, 1);
      }
    }
    updateData.props = updatedProps;
  }

  // 扣除门票入场费
  if (entryFee.tickets && entryFee.tickets.length > 0) {
    const updatedTickets = [...(inventory.tickets || [])];
    for (const requiredTicket of entryFee.tickets) {
      const ticketIndex = updatedTickets.findIndex((ticket: any) =>
        ticket.id === requiredTicket.id || ticket.name === requiredTicket.name
      );
      if (ticketIndex !== -1) {
        updatedTickets.splice(ticketIndex, 1);
      }
    }
    updateData.tickets = updatedTickets;
  }

  // 更新库存
  await ctx.db.patch(inventory._id, updateData);

  // 记录入场费扣除日志
  await ctx.db.insert("entry_fee_logs", {
    uid,
    tournamentType: tournamentType.typeId,
    gameType: tournamentType.gameType,
    entryFee,
    deductedAt: now.iso,
    createdAt: now.iso
  });
}

// ============================================================================
// 基础锦标赛处理器
// ============================================================================

export const baseHandler: TournamentHandler = {
  /**
   * 验证加入条件
   */
  validateJoin: async (ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: any;
  }) => {
    const { uid, gameType, tournamentType } = params;
    const attempts = await getPlayerAttempts(ctx, { uid, tournamentType });
    const maxAttempts = tournamentType.matchRules?.maxAttempts || 1;
    if (attempts >= maxAttempts) {
      throw new Error(`已达到最大尝试次数: ${maxAttempts}`);
    }

    // 获取玩家库存
    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();

    // 验证入场费
    await validateEntryFee(ctx, { uid, tournamentType, inventory });

    // 检查订阅要求
    if (tournamentType.entryRequirements?.isSubscribedRequired) {
      const player = await ctx.db
        .query("players")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

      if (!player || !player.isSubscribed) {
        throw new Error("此锦标赛需要订阅会员才能参与");
      }
    }
    return
  },

  /**
   * 加入锦标赛
   */
  join: async (ctx, { uid, gameType, typeId }) => {
    return;
  },

  deductJoinCost: async (ctx, { uid, tournamentType, inventory }) => {
    await deductEntryFee(ctx, { uid, tournamentType, inventory });
  },



  /**
   * 验证分数
   */
  validateScore: async (ctx, args) => {
    await validateScoreSubmission(ctx, args);
  },

  /**
   * 提交分数
   */
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
      now,
      settleFunction: baseHandler.settle
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

  /**
   * 处理分数提交错误
   */
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

  },

  /**
   * 结算锦标赛
   */
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
  findAndJoinTournament: async (ctx: any, params: any) => {
    return;
  }
};