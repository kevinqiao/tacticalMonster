// @ts-nocheck
import { getTorontoDate } from "../../utils";
import { validateLimits } from "../ruleEngine";
import { baseHandler, TournamentHandler } from "./base";

// 独立锦标赛处理器 - 每次参加都是独立的锦标赛，单独派发奖励
export const independentTournamentHandler: TournamentHandler = {
    ...baseHandler,

    async validateJoin(ctx, { uid, gameType, tournamentType, player, season }) {
        // 获取锦标赛配置
        const tournamentTypeConfig = await ctx.db
            .query("tournament_types")
            .withIndex("by_typeId", (q: any) => q.eq("typeId", tournamentType))
            .first();

        if (tournamentTypeConfig?.defaultConfig?.limits) {
            // 使用配置化的限制验证
            await validateLimits(ctx, {
                uid,
                gameType,
                tournamentType,
                isSubscribed: player.isSubscribed,
                limits: tournamentTypeConfig.defaultConfig.limits,
                seasonId: season._id,
            });
        } else {
            // 使用默认限制配置
            const defaultLimits = {
                daily: {
                    maxParticipations: 3,
                    maxTournaments: 3,
                    maxAttempts: 3
                },
                weekly: {
                    maxParticipations: 21,
                    maxTournaments: 21,
                    maxAttempts: 21
                },
                seasonal: {
                    maxParticipations: 90,
                    maxTournaments: 90,
                    maxAttempts: 90
                },
                total: {
                    maxParticipations: 1000,
                    maxTournaments: 1000,
                    maxAttempts: 1000
                },
                subscribed: {
                    daily: {
                        maxParticipations: 5,
                        maxTournaments: 5,
                        maxAttempts: 5
                    },
                    weekly: {
                        maxParticipations: 35,
                        maxTournaments: 35,
                        maxAttempts: 35
                    },
                    seasonal: {
                        maxParticipations: 150,
                        maxTournaments: 150,
                        maxAttempts: 150
                    }
                }
            };

            await validateLimits(ctx, {
                uid,
                gameType,
                tournamentType,
                isSubscribed: player.isSubscribed,
                limits: defaultLimits,
                seasonId: season._id,
            });
        }

        // 检查玩家库存
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        // 检查参赛费用
        const entryFee = { coins: 50 }; // 独立锦标赛固定费用
        if (inventory.coins < entryFee.coins) {
            throw new Error("金币不足");
        }
    },

    async join(ctx, { uid, gameType, tournamentType, player, season }) {
        const now = getTorontoDate();
        const today = now.localDate.toISOString().split("T")[0];

        // 验证加入条件
        await this.validateJoin(ctx, { uid, gameType, tournamentType, player, season });

        // 扣除参赛费用
        const entryFee = { coins: 50 };
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q) => q.eq("uid", uid))
            .first();

        await ctx.db.patch(inventory._id, {
            coins: inventory.coins - entryFee.coins,
            updatedAt: now.iso
        });

        // 获取今日参赛次数
        const limits = await ctx.db
            .query("player_tournament_limits")
            .withIndex("by_uid_tournament_date", (q: any) =>
                q.eq("uid", uid).eq("tournamentType", tournamentType).eq("date", today)
            )
            .collect();

        const dailyLimit = limits.find(l => l.tournamentType === tournamentType);
        const attemptNumber = (dailyLimit?.participationCount || 0) + 1;

        // 创建独立的锦标赛
        const tournamentId = await ctx.db.insert("tournaments", {
            seasonId: season._id,
            gameType,
            segmentName: player.segmentName,
            status: "open",
            playerUids: [uid],
            tournamentType: "independent_tournament",
            tournamentId: `independent_${uid}_${today}_${attemptNumber}`, // 唯一标识
            isSubscribedRequired: false,
            isSingleMatch: true, // 独立锦标赛总是单场比赛
            prizePool: 100, // 基础奖池
            config: {
                entryFee: { coins: 50 },
                rules: {
                    maxAttempts: 1,
                    isSingleMatch: true,
                    ranking: "threshold",
                    scoreThreshold: 800,
                    attemptNumber, // 记录这是第几次尝试
                    isIndependent: true // 标记为独立锦标赛
                },
                rewards: [
                    { rankRange: [1, 1], coins: 200, gamePoints: 100, props: [], tickets: [] }
                ],
                subscriberBonus: { coins: 1.2, gamePoints: 1.5 }
            },
            createdAt: now.iso,
            updatedAt: now.iso,
            endTime: new Date(now.localDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
        });

        return {
            tournamentId,
            attemptNumber
        };
    },

    async validateScore(ctx, { tournamentId, uid, score }) {
        // 基础验证
        await baseHandler.validateScore(ctx, { tournamentId, uid, gameType: "solitaire", score, gameData: {}, propsUsed: [] });

        // 独立锦标赛特定验证
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
            throw new Error("独立锦标赛只能提交一次分数");
        }

        // 检查分数是否达到阈值
        const config = tournament.config;
        if (score < config.rules.scoreThreshold) {
            throw new Error(`分数未达到阈值 ${config.rules.scoreThreshold}`);
        }
    },

    async settle(ctx, tournamentId) {
        const now = getTorontoDate();

        // 获取锦标赛信息
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 获取完成的比赛记录
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
            .filter((q) => q.eq(q.field("completed"), true))
            .collect();

        if (matches.length === 0) {
            throw new Error("没有完成的比赛记录");
        }

        // 独立锦标赛只有一名玩家，直接处理奖励
        const match = matches[0];
        const score = match.score;

        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q) => q.eq("uid", match.uid))
            .first();

        if (!player) {
            throw new Error(`玩家 ${match.uid} 不存在`);
        }

        // 获取玩家库存
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q) => q.eq("uid", match.uid))
            .first();

        if (!inventory) {
            throw new Error(`玩家 ${match.uid} 库存不存在`);
        }

        // 计算奖励
        const baseReward = 200; // 基础奖励
        const baseGamePoints = 100; // 基础积分

        // 订阅者加成
        const coinMultiplier = player.isSubscribed ? 1.2 : 1.0;
        const gamePointMultiplier = player.isSubscribed ? 1.5 : 1.0;

        const finalCoins = Math.round(baseReward * coinMultiplier);
        const finalGamePoints = Math.round(baseGamePoints * gamePointMultiplier);

        // 发放奖励
        await ctx.db.patch(inventory._id, {
            coins: inventory.coins + finalCoins,
            updatedAt: now.iso
        });

        // 更新赛季积分
        const playerSeason = await ctx.db
            .query("player_seasons")
            .withIndex("by_uid_season", (q) => q.eq("uid", match.uid).eq("seasonId", tournament.seasonId))
            .first();

        if (playerSeason) {
            await ctx.db.patch(playerSeason._id, {
                seasonPoints: playerSeason.seasonPoints + finalGamePoints,
                gamePoints: {
                    ...playerSeason.gamePoints,
                    solitaire: (playerSeason.gamePoints.solitaire || 0) + finalGamePoints,
                },
                updatedAt: now.iso
            });
        }

        // 记录奖励分配
        await ctx.db.insert("tournament_rewards", {
            uid: match.uid,
            tournamentId: tournament._id,
            rank: 1, // 独立锦标赛总是第一名
            score: score,
            rewards: {
                coins: finalCoins,
                gamePoints: finalGamePoints,
                props: [],
                tickets: []
            },
            createdAt: now.iso
        });

        // 发送通知
        await ctx.db.insert("notifications", {
            uid: match.uid,
            message: `独立锦标赛完成！得分：${score}，获得${finalCoins}金币、${finalGamePoints}积分！`,
            createdAt: now.iso
        });

        // 更新锦标赛状态为已完成
        await ctx.db.patch(tournamentId, {
            status: "completed",
            updatedAt: now.iso
        });
    }
}; 