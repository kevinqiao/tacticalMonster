/**
 * Boss AI Actions
 * 提供可调用的API接口，用于Boss AI决策和执行
 */

import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { internalMutation, mutation } from "../../../_generated/server";
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

        // ✅ 1. 执行动作前，加载游戏状态并记录关键角色的初始状态
        const { GameLifecycleService } = await import("../../game/gameLifecycleService");
        const lifecycleService = new GameLifecycleService(ctx);
        const gameBefore = await lifecycleService.load(gameId);
        if (!gameBefore) {
            return { ok: false, error: "游戏不存在" };
        }

        // 记录执行者的初始状态
        const { CharacterQueryService } = await import("../../game/characterQueryService");
        const characterQueryService = new CharacterQueryService();
        characterQueryService.setGame(gameBefore);
        
        const actor = characterQueryService.getCharacter(
            identifier.monsterId,
            identifier.bossId,
            identifier.minionId
        );
        if (!actor) {
            return { ok: false, error: "执行者不存在" };
        }

        const actorStateBefore = {
            q: actor.q ?? 0,
            r: actor.r ?? 0,
            hp: actor.stats?.hp?.current ?? 0,
            mp: actor.stats?.mp?.current ?? 0,
        };

        // 记录目标的初始状态（如果有）
        const targetStatesBefore: Array<{
            identifier: { monsterId?: string; bossId?: string; minionId?: string };
            hp: number;
            mp: number;
        }> = [];
        
        const targets = action.targets || (action.target ? [action.target] : []);
        for (const targetIdentifier of targets) {
            const target = characterQueryService.getCharacter(
                targetIdentifier.monsterId,
                targetIdentifier.bossId,
                targetIdentifier.minionId
            );
            if (target) {
                targetStatesBefore.push({
                    identifier: targetIdentifier,
                    hp: target.stats?.hp?.current ?? 0,
                    mp: target.stats?.mp?.current ?? 0,
                });
            }
        }

        // ✅ 2. 执行动作
        const { GameService } = await import("../../game/gameService");
        const gameManager = new GameService(ctx);
        
        let actionResult: any = null;
        
        switch (action.type) {
            case "attack":
                // 确定目标列表：优先使用 targets，否则使用 target（包装成数组）
                const attackTargets = action.targets || (action.target ? [action.target] : []);
                if (attackTargets.length > 0) {
                    // 执行普通攻击（返回 CombatEvent，包含详细信息）
                    actionResult = await gameManager.attack(gameId, {
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

                    // 直接使用 useSkill 方法（返回详细结果，包括 effects）
                    actionResult = await gameManager.useSkill(gameId, {
                        ...identifier,
                        skillId: action.skillId,
                        targets: skillTargets.length > 0 ? skillTargets : undefined,  // 如果不提供目标，会根据技能范围自动计算
                    });
                }
                break;

            case "move":
                if (action.position) {
                    // 执行移动（返回 phaseChanges）
                    actionResult = await gameManager.walk(
                        gameId,
                        action.position,
                        identifier
                    );
                }
                break;

            case "standby":
                // 待命，不执行任何动作
                return { ok: true, stateChanges: null };
        }

        // ✅ 3. 执行动作后，重新加载游戏状态并对比差异
        const gameAfter = await lifecycleService.load(gameId);
        if (!gameAfter) {
            return { ok: false, error: "执行后游戏状态加载失败" };
        }

        characterQueryService.setGame(gameAfter);
        const actorAfter = characterQueryService.getCharacter(
            identifier.monsterId,
            identifier.bossId,
            identifier.minionId
        );

        // 构建状态变化信息
        const stateChanges: any = {
            actor: null,
            targets: [],
            otherAffected: [],
        };

        // ✅ 执行者的状态变化
        if (actorAfter) {
            const actorStateAfter = {
                q: actorAfter.q ?? 0,
                r: actorAfter.r ?? 0,
                hp: actorAfter.stats?.hp?.current ?? 0,
                mp: actorAfter.stats?.mp?.current ?? 0,
            };

            const hasChanged = 
                actorStateBefore.q !== actorStateAfter.q ||
                actorStateBefore.r !== actorStateAfter.r ||
                actorStateBefore.hp !== actorStateAfter.hp ||
                actorStateBefore.mp !== actorStateAfter.mp;

            if (hasChanged) {
                stateChanges.actor = {
                    identifier,
                    before: actorStateBefore,
                    after: actorStateAfter,
                    positionChanged: actorStateBefore.q !== actorStateAfter.q || actorStateBefore.r !== actorStateAfter.r,
                    hpChanged: actorStateBefore.hp !== actorStateAfter.hp,
                    mpChanged: actorStateBefore.mp !== actorStateAfter.mp,
                };
            }
        }

        // ✅ 目标的状态变化
        for (const targetStateBefore of targetStatesBefore) {
            const targetAfter = characterQueryService.getCharacter(
                targetStateBefore.identifier.monsterId,
                targetStateBefore.identifier.bossId,
                targetStateBefore.identifier.minionId
            );

            if (targetAfter) {
                const targetStateAfter = {
                    hp: targetAfter.stats?.hp?.current ?? 0,
                    mp: targetAfter.stats?.mp?.current ?? 0,
                };

                const hasChanged =
                    targetStateBefore.hp !== targetStateAfter.hp ||
                    targetStateBefore.mp !== targetStateAfter.mp;

                if (hasChanged) {
                    stateChanges.targets.push({
                        identifier: targetStateBefore.identifier,
                        before: targetStateBefore,
                        after: targetStateAfter,
                        hpChanged: targetStateBefore.hp !== targetStateAfter.hp,
                        mpChanged: targetStateBefore.mp !== targetStateAfter.mp,
                    });
                }
            }
        }

        // ✅ 4. 从 actionResult 中提取额外的信息（如 effects、phaseChanges）
        const effects = actionResult?.effects || [];
        const phaseChanges = actionResult?.phaseChanges;

        return {
            ok: true,
            stateChanges: stateChanges.actor || stateChanges.targets.length > 0 ? stateChanges : null,
            effects, // ✅ 技能效果信息（用于前端播放动画）
            phaseChanges, // ✅ 阶段变化（如果有）
        };
    },
});

/**
 * 执行Boss回合（公共API，供前端主动调用）
 * 前端预测Boss动作后，立即调用此API执行并获取结果用于验证
 * 
 * 流程：
 * 1. 获取Boss AI决策
 * 2. 执行Boss动作（Boss本体 + 小怪）
 * 3. 返回决策和执行结果
 */
export const executeBossTurn = mutation({
    args: {
        gameId: v.string(),
        round: v.number(),
    },
    handler: async (ctx, args): Promise<{
        ok: boolean;
        decision: any;
        phaseTransition?: any;
        executionResults: {
            boss: any;
            minions: Array<{ minionId: string; result: any }>;
        };
    }> => {
        // 1. 获取Boss AI决策
        const decision = await BossAIService.decideBossAction(ctx, {
            gameId: args.gameId,
            round: args.round,
        });

        // 2. 获取游戏数据以获取Boss标识符
        const game = await ctx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", args.gameId))
            .first();

        if (!game || !game.boss || !("bossId" in game.boss) || !game.boss.bossId) {
            throw new Error(`游戏不存在或Boss数据不完整: ${args.gameId}`);
        }

        // 3. 执行Boss动作（Boss本体）
        let bossExecutionResult = null;
        if (decision.bossAction.type !== "standby") {
            const bossIdentifier = {
                bossId: (game.boss as any).bossId,
            };
            bossExecutionResult = await ctx.runMutation(
                internal.service.boss.ai.bossAIActions.executeBossAction,
                {
                    gameId: args.gameId,
                    action: decision.bossAction,
                    identifier: bossIdentifier,
                }
            );
        }

        // 4. 执行小怪动作
        const minionResults: Array<{ minionId: string; result: any }> = [];
        if (decision.minionActions && decision.minionActions.length > 0) {
            for (const minionAction of decision.minionActions) {
                if (minionAction.action.type !== "standby") {
                    const minionIdentifier = {
                        minionId: minionAction.minionId,
                    };
                    const result = await ctx.runMutation(
                        internal.service.boss.ai.bossAIActions.executeBossAction,
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

        // 5. 返回决策和执行结果
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

