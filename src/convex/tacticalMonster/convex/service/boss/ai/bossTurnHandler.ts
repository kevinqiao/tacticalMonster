/**
 * Boss回合处理器
 * 处理Boss回合的完整流程：AI决策 -> 执行动作
 */

import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation } from "../../../_generated/server";
import { BossAIService } from "./bossAIService";

/**
 * 处理Boss回合
 * 在Boss回合开始时调用，自动决策并执行Boss动作
 */
export const handleBossTurn = internalMutation({
    args: {
        gameId: v.string(),
        round: v.number(),
    },
    handler: async (ctx, args) => {
        // 1. 从 mr_games 获取游戏数据（包含 Boss 信息）
        const game = await ctx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", args.gameId))
            .first();

        if (!game) {
            throw new Error(`游戏不存在: ${args.gameId}`);
        }

        if (!game.boss) {
            throw new Error(`游戏 ${args.gameId} 没有Boss数据`);
        }

        if (!game.boss.bossId) {
            throw new Error(`Boss缺少bossId标识符`);
        }

        // 2. 获取Boss AI决策
        const decision = await BossAIService.decideBossAction(ctx, {
            gameId: args.gameId,
            round: args.round,
        });

        // 3. 执行Boss动作
        if (decision.bossAction.type !== "standby") {
            // 执行Boss本体动作（使用 bossId 标识符）
            const bossIdentifier = {
                bossId: game.boss.bossId,
            };
            await ctx.scheduler.runAfter(
                0,
                internal.service.boss.ai.bossAIActions.executeBossAction,
                {
                    gameId: args.gameId,
                    action: decision.bossAction,
                    identifier: bossIdentifier,
                }
            );
        }

        // 4. 如果存在小怪，执行小怪动作（简化处理，小怪使用简单AI）
        if (decision.minionActions && decision.minionActions.length > 0) {
            for (const minionAction of decision.minionActions) {
                if (minionAction.action.type !== "standby") {
                    // 使用 minionId 标识符
                    const minionIdentifier = {
                        minionId: minionAction.minionId,
                    };
                    await ctx.scheduler.runAfter(
                        100,  // 延迟执行，避免同时执行太多动作
                        internal.service.boss.ai.bossAIActions.executeBossAction,
                        {
                            gameId: args.gameId,
                            action: minionAction.action,
                            identifier: minionIdentifier,
                        }
                    );
                }
            }
        }

        // ✅ 关键：发送确认事件（供前端验证预测）
        // 在动作执行后立即发送，前端可以验证预测结果
        if (!game.boss.behaviorSeed) {
            throw new Error(`Boss缺少behaviorSeed`);
        }
        const behaviorSeed = game.boss.behaviorSeed;

        await ctx.db.insert("mr_game_event", {
            gameId: args.gameId,
            name: "bossAIDecision",
            type: 0,
            data: {
                decision: decision.bossAction,
                round: args.round,
                seed: `${behaviorSeed}_round_${args.round}`, // 包含种子用于验证
                phaseTransition: decision.phaseTransition,
                timestamp: Date.now(),
            },
            time: Date.now(),
        });

        return {
            ok: true,
            decision,
            phaseTransition: decision.phaseTransition,
        };
    },
});

