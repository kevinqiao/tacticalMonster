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

        // ✅ 从 boss 对象获取 bossId（schema 中可能没有 bossId 字段，需要使用类型断言或从其他地方获取）
        // bossId 在 GameModel 中存在，但数据库查询可能没有包含它
        // 可以通过 GameLifecycleService.load 获取完整的 GameModel，或者使用类型断言
        const bossId = (game.boss as any).bossId;

        if (!bossId) {
            throw new Error(`Boss缺少bossId标识符`);
        }

        // 2. 获取Boss AI决策
        const decision = await BossAIService.decideBossAction(ctx, {
            gameId: args.gameId,
            round: args.round,
        });

        // 3. 执行Boss动作（同步执行，返回结果）
        let bossExecutionResult = null;
        if (decision.bossAction.type !== "standby") {
            // 执行Boss本体动作（使用 bossId 标识符）
            const bossIdentifier = {
                bossId: bossId,
            };
            bossExecutionResult = await ctx.runMutation(
                (internal as any).service.boss.ai.bossAIActions.executeBossAction,
                {
                    gameId: args.gameId,
                    action: decision.bossAction,
                    identifier: bossIdentifier,
                }
            );
        }

        // 4. 如果存在小怪，执行小怪动作（同步执行，返回结果）
        const minionResults: Array<{ minionId: string; result: any }> = [];
        if (decision.minionActions && decision.minionActions.length > 0) {
            for (const minionAction of decision.minionActions) {
                if (minionAction.action.type !== "standby") {
                    // 使用 minionId 标识符
                    const minionIdentifier = {
                        minionId: minionAction.minionId,
                    };
                    const result = await ctx.runMutation(
                        (internal as any).service.boss.ai.bossAIActions.executeBossAction,
                        {
                            gameId: args.gameId,
                            action: minionAction.action,
                            identifier: minionIdentifier,
                        }
                    );
                    minionResults.push({
                        minionId: minionAction.minionId,
                        result,
                    });
                }
            }
        }

        return {
            ok: true,
            decision,
            phaseTransition: decision.phaseTransition,
            executionResults: {
                boss: bossExecutionResult,
                minions: minionResults,
            },
        };
    },
});

