import { internal } from "../../../_generated/api";
import { Doc } from "../../../_generated/dataModel";
import { getTorontoDate } from "../../utils";
import { applyRules, deductEntryFee, validateLimits } from "../ruleEngine";


export interface TournamentHandler {
  validateJoin(ctx: any, args: JoinArgs): Promise<void>;
  join(ctx: any, args: JoinArgs): Promise<JoinResult>;
  validateScore(ctx: any, args: SubmitScoreArgs): Promise<void>;
  submitScore(ctx: any, args: SubmitScoreArgs): Promise<SubmitScoreResult>;
  settle(ctx: any, tournamentId: string): Promise<void>;
  distributeRewards?(ctx: any, data: DistributeRewardsArgs): Promise<void>;
}

interface JoinArgs {
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

interface SubmitScoreArgs {
  tournamentId: string;
  uid: string;
  gameType: string;
  score: number;
  gameData: any;
  propsUsed: string[];
  gameId?: string;
}

interface SubmitScoreResult {
  success: boolean;
  matchId: string;
  score: number;
  deductionResult?: any;
  message: string;
}

interface DistributeRewardsArgs {
  uid: string;
  rank: number;
  score: number;
  tournament: any;
  matches: any[];
}

// 私有辅助函数
async function _updateTournamentStatus(ctx: any, tournament: any, score: number) {
  const now = getTorontoDate();

  // 更新锦标赛状态
  await ctx.db.patch(tournament._id, {
    updatedAt: now.iso
  });
}

async function _logPropUsage(ctx: any, data: {
  uid: string;
  tournamentId: string;
  matchId: string;
  propsUsed: string[];
  gameId?: string;
  deductionResult?: any;
}) {
  const now = getTorontoDate();

  // 记录道具使用日志
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

  // 只有在有延迟扣除结果时才添加 deductionId
  if (data.deductionResult?.deductionId) {
    logData.deductionId = data.deductionResult.deductionId;
  }

  await ctx.db.insert("prop_usage_logs", logData);
}

// 创建锦标赛的辅助函数
async function createTournament(ctx: any, { uid, gameType, tournamentType, player, season, config, now }: {
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

// 创建独立锦标赛的辅助函数（每次尝试都是独立的）
async function createIndependentTournament(ctx: any, { uid, gameType, tournamentType, player, season, config, now, attemptNumber }: {
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
    tournamentId: `${tournamentType}_${uid}_${today}_${attemptNumber}`, // 唯一标识
    isSubscribedRequired: config.isSubscribedRequired || false,
    isSingleMatch: true, // 独立锦标赛总是单场比赛
    prizePool: config.entryFee?.coins ? config.entryFee.coins * 0.8 : 0,
    config: {
      ...config,
      attemptNumber, // 记录这是第几次尝试
      isIndependent: true // 标记为独立锦标赛
    },
    createdAt: now.iso,
    updatedAt: now.iso,
    endTime: new Date(now.localDate.getTime() + (config.duration || 24 * 60 * 60 * 1000)).toISOString(),
  });
}

export const baseHandler: TournamentHandler = {
  async validateJoin(ctx, { uid, gameType, tournamentType, player, season }) {
    const now = getTorontoDate();
    const today = now.localDate.toISOString().split("T")[0];

    const tournamentTypeConfig = await ctx.db
      .query("tournament_types")
      .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
      .first();
    const config = tournamentTypeConfig?.defaultConfig || {};

    // 验证限制（如果配置了限制）
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
  },

  async join(ctx, { uid, gameType, tournamentType, player, season }) {
    const now = getTorontoDate();
    const today = now.localDate.toISOString().split("T")[0];

    const tournamentTypeConfig = await ctx.db
      .query("tournament_types")
      .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
      .first();
    const config = tournamentTypeConfig?.defaultConfig || {};

    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();
    if (config.entryFee) {
      await deductEntryFee(ctx, { uid, gameType, tournamentType, entryFee: config.entryFee, inventory });
    }

    // 检查参赛次数限制
    const attempts = await getPlayerAttempts(ctx, { uid, tournamentType, gameType });
    if (config.rules?.maxAttempts && attempts >= config.rules.maxAttempts) {
      throw new Error("已达最大尝试次数");
    }

    // 记录参赛限制（如果配置了每日限制）
    if (config.rules?.dailyLimit) {
      const limits = await ctx.db
        .query("player_tournament_limits")
        .withIndex("by_uid_game_date", (q: any) =>
          q.eq("uid", uid).eq("gameType", gameType).eq("date", today)
        )
        .collect();

      const dailyLimit = limits.find((l: any) => l.tournamentType === tournamentType);
      if (dailyLimit && dailyLimit.participationCount >= config.rules.dailyLimit) {
        throw new Error("今日参赛次数已达上限");
      }

      if (dailyLimit) {
        await ctx.db.patch(dailyLimit._id, {
          participationCount: dailyLimit.participationCount + 1,
          updatedAt: now.iso
        });
      } else {
        await ctx.db.insert("player_tournament_limits", {
          uid,
          gameType,
          date: today,
          tournamentType,
          participationCount: 1,
          createdAt: now.iso,
          updatedAt: now.iso
        });
      }
    }

    // 确定锦标赛创建策略
    let tournamentId;
    const attemptNumber = attempts + 1;

    if (config.rules?.independentAttempts) {
      // 每次尝试都创建独立的锦标赛
      tournamentId = await createIndependentTournament(ctx, {
        uid,
        gameType,
        tournamentType,
        player,
        season,
        config,
        now,
        attemptNumber
      });
    } else if (config.rules?.allowReuse) {
      // 复用现有锦标赛（多人共享）
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
        // 检查玩家是否已经在该锦标赛中
        if (existingTournament.playerUids.includes(uid)) {
          // 玩家已在该锦标赛中，检查提交次数限制
          const playerMatches = await ctx.db
            .query("matches")
            .withIndex("by_tournament_uid", (q: any) =>
              q.eq("tournamentId", existingTournament._id).eq("uid", uid)
            )
            .filter((q: any) => q.eq(q.field("completed"), true))
            .collect();

          const maxSubmissionsPerTournament = config.rules?.maxSubmissionsPerTournament || 1;

          // 检查是否允许多次提交
          if (maxSubmissionsPerTournament === 1 && playerMatches.length >= 1) {
            throw new Error("您已参与该锦标赛，不能重复提交分数");
          } else if (maxSubmissionsPerTournament > 1 && playerMatches.length >= maxSubmissionsPerTournament) {
            throw new Error(`在该锦标赛中最多只能提交${maxSubmissionsPerTournament}次分数`);
          } else if (maxSubmissionsPerTournament === -1) {
            // 无限制提交，继续执行
          }
        }

        // 添加到现有锦标赛
        tournamentId = existingTournament._id;
        if (!existingTournament.playerUids.includes(uid)) {
          await ctx.db.patch(tournamentId, {
            playerUids: [...existingTournament.playerUids, uid]
          });
        }
      } else {
        // 检查是否达到最大锦标赛数量限制
        if (config.rules?.maxTournamentsPerDay) {
          const todayTournaments = await ctx.db
            .query("tournaments")
            .filter((q: any) =>
              q.and(
                q.eq(q.field("tournamentType"), tournamentType),
                q.eq(q.field("gameType"), gameType),
                q.eq(q.field("playerUids"), uid),
                q.gte(q.field("createdAt"), today + "T00:00:00.000Z")
              )
            )
            .collect();

          if (todayTournaments.length >= config.rules.maxTournamentsPerDay) {
            throw new Error(`今日该类型锦标赛参与次数已达上限（${config.rules.maxTournamentsPerDay}次）`);
          }
        }

        // 创建新锦标赛
        tournamentId = await createTournament(ctx, { uid, gameType, tournamentType, player, season, config, now });
      }
    } else {
      // 总是创建新锦标赛
      tournamentId = await createTournament(ctx, { uid, gameType, tournamentType, player, season, config, now });
    }

    // 创建初始match记录（如果配置要求）
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

  async validateScore(ctx, { tournamentId, gameType, score, gameData, propsUsed }) {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) throw new Error("无效锦标赛");
    if (propsUsed.length > 3) throw new Error("道具使用超限");
    if (gameType === "solitaire") {
      // Robust null checks for config and scoring
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
  },

  async submitScore(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId }) {
    const now = getTorontoDate();

    try {
      // 1. 获取锦标赛信息
      const tournament = await ctx.db.get(tournamentId);
      if (!tournament) {
        throw new Error("锦标赛不存在");
      }

      // 2. 验证提交条件
      await this.validateScore(ctx, { tournamentId, gameType, score, gameData, propsUsed, uid });

      // 3. 创建比赛记录
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

      // 4. 执行延迟扣除（如果使用了道具）
      let deductionResult = null;
      if (propsUsed.length > 0 && gameId) {
        try {
          const unifiedPropManager = (internal as any)["service/prop/unifiedPropManager"];
          deductionResult = await ctx.runMutation(unifiedPropManager.executeDelayedDeduction, {
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
        } catch (error) {
          console.error("执行延迟扣除失败:", error);
        }
      }

      // 5. 更新锦标赛状态
      await _updateTournamentStatus(ctx, tournament, score);

      // 6. 检查是否需要立即结算（单人锦标赛）
      let shouldSettle = false;
      let settleReason = "";

      // 检查是否为单人锦标赛
      if (tournament.isSingleMatch || tournament.config?.rules?.isSingleMatch) {
        shouldSettle = true;
        settleReason = "单人锦标赛，玩家完成比赛";
      }

      // 检查是否为独立锦标赛
      if (tournament.config?.isIndependent) {
        shouldSettle = true;
        settleReason = "独立锦标赛，玩家完成比赛";
      }

      // 检查是否所有玩家都已完成
      if (!shouldSettle && tournament.playerUids && tournament.playerUids.length > 0) {
        // 只统计唯一完成的玩家数
        const completedCount = await ctx.db
          .query("matches")
          .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
          .filter((q: any) => q.eq(q.field("completed"), true))
          .collect()
          .then((matches: any) => {
            // 使用Set去重，避免同一玩家多次提交
            const uniqueCompletedPlayers = new Set(matches.map((m: any) => m.uid));
            return uniqueCompletedPlayers.size;
          });

        if (completedCount >= tournament.playerUids.length) {
          shouldSettle = true;
          settleReason = "所有玩家都已完成比赛";
        }
      }

      // 7. 如果满足结算条件，立即结算
      if (shouldSettle) {
        try {
          console.log(`立即结算锦标赛 ${tournamentId}: ${settleReason}`);
          await this.settle(ctx, tournamentId);

          return {
            success: true,
            matchId,
            score,
            deductionResult,
            settled: true,
            settleReason,
            message: "分数提交成功，锦标赛已结算"
          };
        } catch (settleError) {
          console.error("立即结算失败:", settleError);
          // 结算失败不影响分数提交的成功
        }
      }

      // 8. 记录道具使用日志
      if (propsUsed.length > 0) {
        await _logPropUsage(ctx, {
          uid,
          tournamentId,
          matchId,
          propsUsed,
          gameId,
          deductionResult
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

      throw error;
    }
  },

  async settle(ctx, tournamentId) {
    const now = getTorontoDate();

    // 获取锦标赛信息
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw new Error("锦标赛不存在");
    }

    // 获取所有完成的比赛记录
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
      .filter((q: any) => q.eq(q.field("completed"), true))
      .collect();

    if (matches.length === 0) {
      throw new Error("没有完成的比赛记录");
    }

    // 计算排名
    const playerScores = new Map<string, number>();
    for (const match of matches) {
      // 对于多次尝试的锦标赛，取最高分
      const currentScore = playerScores.get(match.uid) || 0;
      playerScores.set(match.uid, Math.max(currentScore, match.score));
    }

    const sortedPlayers = Array.from(playerScores.entries())
      .sort((a: any, b: any) => b[1] - a[1])
      .map(([uid, score], index) => ({
        uid,
        score,
        rank: index + 1
      }));

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

        // 记录错误日志
        await ctx.db.insert("error_logs", {
          error: `分配奖励失败: ${error.message}`,
          context: "tournament_settle",
          uid: playerData.uid,
          createdAt: now.iso
        });
      }
    }

    // 更新锦标赛状态为已完成
    await ctx.db.patch(tournamentId, {
      status: "completed",
      updatedAt: now.iso
    });
  },

  // 默认的奖励分配方法 - 可以被handler重写
  async distributeRewards(ctx: any, data: {
    uid: string;
    rank: number;
    score: number;
    tournament: any;
    matches: any[];
  }) {
    const { uid, rank, score, tournament, matches } = data;
    const now = getTorontoDate();

    // 获取玩家信息
    const player = await ctx.db
      .query("players")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();

    if (!player) {
      throw new Error(`玩家 ${uid} 不存在`);
    }

    // 获取玩家库存
    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", uid))
      .first();

    if (!inventory) {
      throw new Error(`玩家 ${uid} 库存不存在`);
    }

    // 获取玩家赛季信息
    const playerSeason = await ctx.db
      .query("player_seasons")
      .withIndex("by_uid_season", (q: any) => q.eq("uid", uid).eq("seasonId", tournament.seasonId))
      .first();

    if (!playerSeason) {
      throw new Error(`玩家 ${uid} 赛季信息不存在`);
    }

    // 使用ruleEngine处理奖励分配
    const { finalReward } = await applyRules(ctx, {
      tournament,
      uid,
      matches,
      player,
      inventory,
      playerSeason
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
  }
};

export async function getPlayerAttempts(ctx: any, { uid, tournamentType, gameType }: { uid: string, tournamentType: string, gameType: string }) {
  // 直接查询该玩家参与的特定类型锦标赛数量
  const tournaments = await ctx.db
    .query("tournaments")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("tournamentType"), tournamentType),
        q.eq(q.field("gameType"), gameType),
        q.eq(q.field("playerUids"), uid)
      )
    )
    .collect();

  return tournaments.length;
}