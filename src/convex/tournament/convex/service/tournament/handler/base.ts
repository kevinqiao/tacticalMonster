import { SegmentSystem } from "../../segment/segmentSystem";
import { getTorontoDate } from "../../utils";
import {
  TournamentHandler,
  createTournament,
  getPlayerAttempts
} from "../common";
import { MatchManager } from "../matchManager";
import { TournamentMatchingService } from "../tournamentMatchingService";

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
 * 段位奖励结果
 */
interface SegmentRewardResult {
  uid: string;
  oldSegment: string;
  newSegment: string;
  scoreChange: number;
  segmentChanged: boolean;
  isPromotion: boolean;
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
 * 完成锦标赛
 */
async function completeTournament(ctx: any, tournamentId: string, now: any): Promise<void> {
  await ctx.db.patch(tournamentId, {
    status: "completed",
    updatedAt: now.iso
  });
}

/**
 * 计算锦标赛排名并分配段位分数
 */
async function calculateTournamentRankingsAndSegmentRewards(ctx: any, tournamentId: string, tournamentType: string) {
  const now = getTorontoDate();

  // 获取所有参与玩家
  const playerTournaments = await ctx.db
    .query("player_tournaments")
    .withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  // 根据锦标赛类型确定排名方法
  let rankings: any[] = [];

  if (tournamentType === "single_match") {
    // 单场比赛：根据单场比赛排名
    rankings = await calculateSingleMatchRankings(ctx, tournamentId);
  } else {
    // 多场比赛：根据累计 gamePoint 排名
    rankings = await calculateMultiMatchRankings(ctx, tournamentId);
  }

  // 分配段位分数奖励
  const segmentRewards: SegmentRewardResult[] = [];
  const totalPlayers = rankings.length;

  for (const ranking of rankings) {
    const { uid, rank, gameType } = ranking;

    // 计算段位分数奖励
    const scoreChange = SegmentSystem.calculateTournamentSegmentReward(
      tournamentType,
      rank,
      totalPlayers
    );

    // 更新玩家段位分数
    const segmentResult = await SegmentSystem.updatePlayerSegmentScore(ctx, {
      uid,
      gameType,
      scoreChange,
      tournamentType,
      tournamentId,
      rank,
      totalPlayers
    });

    segmentRewards.push({
      uid,
      oldSegment: segmentResult.oldSegment,
      newSegment: segmentResult.newSegment,
      scoreChange,
      segmentChanged: segmentResult.segmentChanged,
      isPromotion: segmentResult.isPromotion
    });

    // 记录段位奖励日志
    await ctx.db.insert("segment_rewards", {
      uid,
      tournamentId,
      tournamentType,
      gameType,
      rank,
      scoreChange,
      oldSegment: segmentResult.oldSegment,
      newSegment: segmentResult.newSegment,
      segmentChanged: segmentResult.segmentChanged,
      isPromotion: segmentResult.isPromotion,
      createdAt: now.iso
    });
  }

  return {
    rankings,
    segmentRewards,
    totalPlayers
  };
}

/**
 * 计算单场比赛排名
 */
async function calculateSingleMatchRankings(ctx: any, tournamentId: string) {
  // 获取锦标赛的所有比赛
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
    .filter((q: any) => q.eq(q.field("status"), "completed"))
    .collect();

  if (matches.length === 0) {
    return [];
  }

  // 单场比赛只有一个比赛，直接使用比赛排名
  const match = matches[0];
  const playerMatches = await ctx.db
    .query("player_matches")
    .withIndex("by_match", (q: any) => q.eq("matchId", match._id))
    .filter((q: any) => q.eq(q.field("completed"), true))
    .order("desc", (q: any) => q.field("score"))
    .collect();

  // 按分数排序并分配排名
  const rankings = [];
  for (let i = 0; i < playerMatches.length; i++) {
    const playerMatch = playerMatches[i];
    rankings.push({
      uid: playerMatch.uid,
      gameType: playerMatch.gameType,
      score: playerMatch.score,
      rank: i + 1
    });
  }

  return rankings;
}

/**
 * 计算多场比赛排名
 */
async function calculateMultiMatchRankings(ctx: any, tournamentId: string) {
  // 获取所有参与玩家的累计 gamePoint
  const playerTournaments = await ctx.db
    .query("player_tournaments")
    .withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  // 按累计 gamePoint 排序
  const rankings = playerTournaments
    .sort((a: any, b: any) => (b.gamePoint || 0) - (a.gamePoint || 0))
    .map((pt: any, index: number) => ({
      uid: pt.uid,
      gameType: pt.gameType,
      gamePoint: pt.gamePoint || 0,
      rank: index + 1
    }));

  return rankings;
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
    player: any;
    tournamentType: any;
  }) => {
    const { player, tournamentType } = params;
    const playedMatches = await getPlayerAttempts(ctx, { uid: player.uid, tournamentType });
    const maxAttempts = tournamentType.matchRules?.maxAttempts || 1;
    if (playedMatches.length >= maxAttempts) {
      throw new Error(`已达到最大尝试次数: ${maxAttempts}`);
    }

    // 获取玩家库存
    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", player.uid))
      .first();

    // 验证入场费
    await validateEntryFee(ctx, { uid: player.uid, tournamentType, inventory });

    // 检查订阅要求
    if (tournamentType.entryRequirements?.isSubscribedRequired && !player.isSubscribed) {
      throw new Error("此锦标赛需要订阅会员才能参与");
    }

    // 检查段位要求
    if (tournamentType.entryRequirements?.minSegment) {
      const playerSegment = await ctx.db
        .query("player_segments")
        .withIndex("by_uid_game", (q: any) => q.eq("uid", player.uid).eq("gameType", tournamentType.gameType))
        .first();

      if (!playerSegment) {
        // 初始化玩家段位
        await SegmentSystem.initializePlayerSegment(ctx, player.uid, tournamentType.gameType);
      } else {
        const playerSegmentTier = SegmentSystem.getSegmentTier(playerSegment.segmentName);
        const requiredSegmentTier = SegmentSystem.getSegmentTier(tournamentType.entryRequirements.minSegment);

        if (playerSegmentTier < requiredSegmentTier) {
          throw new Error(`段位不足，需要 ${tournamentType.entryRequirements.minSegment} 段位以上`);
        }
      }
    }

    return;
  },

  /**
   * 加入锦标赛
   */
  join: async (ctx, { player, tournamentType, tournament }) => {
    await baseHandler.validateJoin(ctx, { player, tournamentType });

    if (tournamentType.matchRules.isSingleMatch && tournamentType.matchRules.matchType === "single_match") {
      const tournamentObj = await createTournament(ctx, { players: [player.uid], tournamentType });
      const matchId = await MatchManager.createMatch(ctx, {
        tournamentId: tournamentObj._id,
        typeId: tournamentType.typeId,
      });
      return {
        tournamentId: tournament._id,
        attemptNumber: 1,
        matchId
      }
    }

    await TournamentMatchingService.joinMatchingQueue(ctx, {
      tournament,
      tournamentType,
      player
    });

    return;
  },

  deductJoinCost: async (ctx, { uid, tournamentType, inventory }) => {
    await deductEntryFee(ctx, { uid, tournamentType, inventory });
  },

  /**
   * 提交分数
   */
  submitScore: async (ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId }) => {
    const now = getTorontoDate();

    // 验证分数提交
    // 获取锦标赛信息
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw new Error("锦标赛不存在");
    }

    // 获取比赛记录
    const playerMatch = await ctx.db
      .query("player_matches")
      .withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId).eq("uid", uid))
      .filter((q: any) => q.eq(q.field("completed"), false))
      .first();

    if (!playerMatch) {
      throw new Error("未找到有效的比赛记录");
    }

    // 更新比赛记录
    await ctx.db.patch(playerMatch._id, {
      score,
      gameData,
      propsUsed,
      completed: true,
      updatedAt: now.iso
    });

    // 如果是单场比赛，检查是否需要立即结算
    if (tournament.isSingleMatch) {
      const allPlayerMatches = await ctx.db
        .query("player_matches")
        .withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournamentId))
        .filter((q: any) => q.eq(q.field("completed"), true))
        .collect();

      if (allPlayerMatches.length >= tournament.config?.matchRules?.minPlayers || 2) {
        // 立即结算
        await baseHandler.settle(ctx, tournamentId);
        return {
          success: true,
          matchId: playerMatch._id,
          score,
          message: "分数提交成功，锦标赛已结算",
          settled: true,
          settleReason: "single_match_completed"
        };
      }
    }

    return {
      success: true,
      matchId: playerMatch._id,
      score,
      message: "分数提交成功",
      settled: false
    };
  },

  /**
   * 结算锦标赛
   */
  async settle(ctx, tournamentId) {
    const now = getTorontoDate();

    // 验证锦标赛是否可以结算
    const tournament = await validateTournamentForSettlement(ctx, tournamentId);

    // 计算排名并分配段位分数
    const { rankings, segmentRewards, totalPlayers } = await calculateTournamentRankingsAndSegmentRewards(
      ctx,
      tournamentId,
      tournament.tournamentType
    );

    // 完成锦标赛
    await completeTournament(ctx, tournamentId, now);

    console.log(`锦标赛 ${tournamentId} 结算完成，参与玩家 ${totalPlayers} 人，段位变更 ${segmentRewards.filter(r => r.segmentChanged).length} 人`);
  }
};