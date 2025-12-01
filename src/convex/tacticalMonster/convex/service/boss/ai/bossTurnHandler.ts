/**
 * Boss回合处理器
 * 处理Boss回合的完整流程：AI决策 -> 执行动作
 */

import { internalMutation } from "../../../_generated/server";
import { v } from "convex/values";
import { BossAIService } from "./bossAIService";
import { BossInstanceService } from "../bossInstanceService";
import { internal } from "../../../_generated/api";

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
        // 1. 获取Boss实例
        const bossInstance = await BossInstanceService.getBossInstance(ctx, args.gameId);
        if (!bossInstance) {
            throw new Error(`游戏 ${args.gameId} 没有Boss实例`);
        }

        // 2. 获取Boss AI决策
        const decision = await BossAIService.decideBossAction(ctx, {
            gameId: args.gameId,
            bossInstanceId: bossInstance.bossInstanceId,
            round: args.round,
        });

        // 3. 执行Boss动作
        const bossMainCharacterId = bossInstance.characterIds.bossMain;

        if (decision.bossAction.type !== "standby") {
            // 执行Boss本体动作
            await ctx.scheduler.runAfter(
                0,
                internal.service.boss.ai.bossAIActions.executeBossAction,
                {
                    gameId: args.gameId,
                    action: decision.bossAction,
                    characterId: bossMainCharacterId,
                }
            );
        }

        // 4. 如果存在小怪，执行小怪动作（简化处理，小怪使用简单AI）
        if (decision.minionActions && decision.minionActions.length > 0) {
            for (const minionAction of decision.minionActions) {
                if (minionAction.action.type !== "standby") {
                    await ctx.scheduler.runAfter(
                        100,  // 延迟执行，避免同时执行太多动作
                        internal.service.boss.ai.bossAIActions.executeBossAction,
                        {
                            gameId: args.gameId,
                            action: minionAction.action,
                            characterId: minionAction.minionId,
                        }
                    );
                }
            }
        }

        // ✅ 关键：发送确认事件（供前端验证预测）
        // 在动作执行后立即发送，前端可以验证预测结果
        await ctx.db.insert("tacticalMonster_event", {
            gameId: args.gameId,
            name: "bossAIDecision",
            type: 0,
            data: {
                decision: decision.bossAction,
                round: args.round,
                seed: `${bossInstance.behaviorSeed}_round_${args.round}`, // 包含种子用于验证
                phaseTransition: decision.phaseTransition,
                timestamp: Date.now(),
            },
            isSynced: false,
            time: Date.now(),
        });

        return {
            ok: true,
            decision,
            phaseTransition: decision.phaseTransition,
        };
    },
});

