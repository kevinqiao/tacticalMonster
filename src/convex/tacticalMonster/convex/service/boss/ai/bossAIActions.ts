/**
 * Boss AI Actions
 * 提供可调用的API接口，用于Boss AI决策和执行
 */

import { v } from "convex/values";
import { internalMutation } from "../../../_generated/server";
import { BossAIService } from "./bossAIService";

/**
 * 获取Boss AI决策
 * 在Boss回合时调用，返回Boss应该执行的动作
 */
export const getBossAIDecision = internalMutation({
    args: {
        gameId: v.string(),
        round: v.number(),
    },
    handler: async (ctx, args) => {
        // 直接调用BossAIService，它会从mr_games获取Boss数据
        const decision = await BossAIService.decideBossAction(ctx, {
            gameId: args.gameId,
            round: args.round,
        });

        return decision;
    },
});

/**
 * 执行Boss AI动作
 * 根据AI决策执行Boss的动作（攻击、移动、技能等）
 * 
 * 支持执行Boss主体和小怪的动作，通过 CharacterIdentifier 区分
 */
export const executeBossAction = internalMutation({
    args: {
        gameId: v.string(),
        action: v.object({
            type: v.union(
                v.literal("use_skill"),
                v.literal("attack"),
                v.literal("move"),
                v.literal("standby")
            ),
            skillId: v.optional(v.string()),
            // 支持单个目标或多个目标（使用 CharacterIdentifier）
            target: v.optional(v.object({
                monsterId: v.optional(v.string()),
                bossId: v.optional(v.string()),
                minionId: v.optional(v.string()),
            })),
            targets: v.optional(v.array(v.object({
                monsterId: v.optional(v.string()),
                bossId: v.optional(v.string()),
                minionId: v.optional(v.string()),
            }))),
            position: v.optional(v.object({
                q: v.number(),
                r: v.number(),
            })),
        }),
        // 执行者标识符（CharacterIdentifier，用于区分Boss主体和小怪）
        identifier: v.object({
            monsterId: v.optional(v.string()),
            bossId: v.optional(v.string()),
            minionId: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const { gameId, action, identifier } = args;

        // 获取gameService服务
        const { GameService } = await import("../../game/gameService");

        const gameManager = new GameService(ctx);

        switch (action.type) {
            case "attack":
                // 确定目标列表：优先使用 targets，否则使用 target（包装成数组）
                const attackTargets = action.targets || (action.target ? [action.target] : []);
                if (attackTargets.length > 0) {
                    // 执行普通攻击
                    await gameManager.attack(gameId, {
                        attacker: identifier,
                        skillSelect: "", // 普通攻击不需要技能
                        targets: attackTargets,
                    });
                }
                break;

            case "use_skill":
                if (action.skillId) {
                    // 确定目标列表：优先使用 targets，否则使用 target（包装成数组）
                    const skillTargets = action.targets || (action.target ? [action.target] : []);

                    // 直接使用 useSkill 方法（更清晰，支持自动计算目标）
                    await gameManager.useSkill(gameId, {
                        ...identifier,
                        skillId: action.skillId,
                        targets: skillTargets.length > 0 ? skillTargets : undefined,  // 如果不提供目标，会根据技能范围自动计算
                    });
                }
                break;

            case "move":
                if (action.position) {
                    // 执行移动
                    await gameManager.walk(
                        gameId,
                        action.position,
                        identifier
                    );
                }
                break;

            case "standby":
                // 待命，不执行任何动作
                break;
        }

        return { ok: true };
    },
});

