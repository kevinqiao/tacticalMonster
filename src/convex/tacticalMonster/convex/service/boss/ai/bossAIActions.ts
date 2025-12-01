/**
 * Boss AI Actions
 * 提供可调用的API接口，用于Boss AI决策和执行
 */

import { internalMutation } from "../../../_generated/server";
import { v } from "convex/values";
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
        // 获取Boss实例ID
        const bossInstance = await ctx.db
            .query("mr_boss_instances")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", args.gameId))
            .first();

        if (!bossInstance) {
            throw new Error(`游戏 ${args.gameId} 没有Boss实例`);
        }

        const decision = await BossAIService.decideBossAction(ctx, {
            gameId: args.gameId,
            bossInstanceId: bossInstance.bossInstanceId,
            round: args.round,
        });

        return decision;
    },
});

/**
 * 执行Boss AI动作
 * 根据AI决策执行Boss的动作（攻击、移动、技能等）
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
            target: v.optional(v.object({
                uid: v.string(),
                character_id: v.string(),
            })),
            position: v.optional(v.object({
                q: v.number(),
                r: v.number(),
            })),
        }),
        characterId: v.string(),  // Boss本体的character_id
    },
    handler: async (ctx, args) => {
        const { gameId, action, characterId } = args;

        // 获取gameService服务
        const { TacticalMonsterGameManager } = await import("../../game/gameService");

        const gameManager = new TacticalMonsterGameManager(ctx);

        switch (action.type) {
            case "attack":
                if (action.target) {
                    // 执行攻击
                    await gameManager.attack(gameId, {
                        attacker: {
                            uid: "boss",
                            character_id: characterId,
                        },
                        target: action.target,
                    });
                }
                break;

            case "use_skill":
                if (action.skillId && action.target) {
                    // 先选择技能
                    await gameManager.selectSkill(gameId, {
                        skillId: action.skillId,
                    });

                    // 然后执行攻击（使用技能）
                    await gameManager.attack(gameId, {
                        attacker: {
                            uid: "boss",
                            character_id: characterId,
                            skillSelect: action.skillId,
                        },
                        target: action.target,
                    });
                }
                break;

            case "move":
                if (action.position) {
                    // 执行移动
                    await gameManager.walk(
                        gameId,
                        "boss",
                        characterId,
                        action.position
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

