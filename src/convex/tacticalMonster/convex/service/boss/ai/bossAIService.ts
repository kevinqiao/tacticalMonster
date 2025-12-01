/**
 * Boss AI服务
 * 主AI决策服务，整合所有AI组件
 */

import { PhaseManager } from "./phaseManager";
import { BehaviorTreeExecutor, ExecutionContext } from "./behaviorTreeExecutor";
import { TargetSelector, TargetCharacter } from "./targetSelector";
import { ConditionEvaluator, GameState, BossState } from "./conditionEvaluator";
import { SeededRandom } from "../../../utils/seededRandom";
import { hexDistance } from "../../../utils/hexUtils";
import { BossConfigService } from "../bossConfigService";
import { BossInstanceService } from "../bossInstanceService";

export interface BossAction {
    type: "use_skill" | "attack" | "move" | "standby";
    skillId?: string;
    target?: {
        uid: string;
        character_id: string;
    };
    position?: { q: number; r: number };
}

export interface BossAIDecision {
    bossAction: BossAction;
    minionActions?: Array<{
        minionId: string;
        action: BossAction;
    }>;
    phaseTransition?: {
        fromPhase: string;
        toPhase: string;
    };
}

export class BossAIService {
    /**
     * 决策Boss下一回合的行为
     */
    static async decideBossAction(
        ctx: any,
        params: {
            gameId: string;
            bossInstanceId: string;
            round: number;
        }
    ): Promise<BossAIDecision> {
        // 1. 获取Boss实例和配置
        const bossInstance = await BossInstanceService.getBossInstance(ctx, params.gameId);
        if (!bossInstance) {
            throw new Error(`Boss实例不存在: ${params.bossInstanceId}`);
        }

        const bossConfig = BossConfigService.getBossConfig(bossInstance.bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${bossInstance.bossId}`);
        }

        // 2. 获取Boss本体角色状态
        const bossMain = await ctx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game", (q: any) => q.eq("gameId", params.gameId))
            .filter((q: any) => q.eq(q.field("character_id"), bossInstance.characterIds.bossMain))
            .first();

        if (!bossMain || (bossMain.stats?.hp?.current || 0) <= 0) {
            return {
                bossAction: { type: "standby" },
            };
        }

        // 3. 获取玩家角色（敌人）
        const playerCharacters = await ctx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game", (q: any) => q.eq("gameId", params.gameId))
            .filter((q: any) => q.neq(q.field("uid"), "boss"))
            .collect();

        const targets: TargetCharacter[] = playerCharacters
            .filter((char: any) => (char.stats?.hp?.current || 0) > 0)
            .map((char: any) => ({
                uid: char.uid,
                character_id: char.character_id,
                q: char.q || 0,
                r: char.r || 0,
                currentHp: char.stats?.hp?.current || 0,
                maxHp: char.stats?.hp?.max || 0,
                totalDamage: 0,  // TODO: 从游戏记录中获取
                threatValue: 0,
            }));

        // 4. 检查阶段转换
        const bossState: BossState = {
            currentHp: bossMain.stats?.hp?.current || 0,
            maxHp: bossMain.stats?.hp?.max || 0,
            skillCooldowns: bossMain.cooldowns || {},
            statusEffects: bossMain.statusEffects || [],
        };

        let phaseTransition = undefined;
        if (bossConfig.phases && bossConfig.phases.length > 0) {
            const phaseCheck = PhaseManager.checkPhaseTransition(
                bossState.currentHp,
                bossState.maxHp,
                bossConfig.phases,
                bossInstance.currentPhase
            );

            if (phaseCheck.shouldTransition && phaseCheck.newPhase) {
                // 更新阶段
                await ctx.db.patch(bossInstance._id, {
                    currentPhase: phaseCheck.newPhase,
                    updatedAt: new Date().toISOString(),
                });

                phaseTransition = {
                    fromPhase: bossInstance.currentPhase || "phase1",
                    toPhase: phaseCheck.newPhase,
                };
            }
        }

        // 5. 获取当前阶段配置
        const currentPhase = bossInstance.currentPhase || "phase1";
        const phaseConfig = bossConfig.phases?.find(p => p.phaseName === currentPhase);

        // 6. 准备执行上下文
        const gameState: GameState = {
            round: params.round,
            seed: bossInstance.behaviorSeed,
            playerCount: targets.length,
            enemyCount: targets.length,
            minionCount: bossInstance.characterIds.minions.length,
        };

        // 计算到最近敌人的距离
        if (targets.length > 0) {
            const nearest = TargetSelector.selectTarget(
                "nearest",
                targets,
                { q: bossMain.q || 0, r: bossMain.r || 0 }
            );
            if (nearest) {
                gameState.distanceToNearest = hexDistance(
                    { q: bossMain.q || 0, r: bossMain.r || 0 },
                    { q: nearest.q, r: nearest.r }
                );
            }
        }

        const rng = new SeededRandom(
            `${bossInstance.behaviorSeed}_round_${params.round}`
        );

        const context: ExecutionContext = {
            bossState,
            gameState,
            targets,
            bossPosition: { q: bossMain.q || 0, r: bossMain.r || 0 },
            rng,
        };

        // 7. 执行行为树或使用阶段配置
        let bossAction: BossAction;

        if (bossConfig.behaviorTree && Object.keys(bossConfig.behaviorTree).length > 0) {
            // 使用行为树
            const result = BehaviorTreeExecutor.execute(
                bossConfig.behaviorTree as any,
                context
            );

            bossAction = this.convertActionResultToAction(result);
        } else if (phaseConfig) {
            // 使用阶段配置的简化决策
            bossAction = this.decideFromPhaseConfig(phaseConfig, context);
        } else {
            // 默认行为：攻击最近敌人
            const target = TargetSelector.selectTarget(
                "nearest",
                targets,
                { q: bossMain.q || 0, r: bossMain.r || 0 },
                rng
            );

            bossAction = {
                type: target ? "attack" : "standby",
                target: target ? {
                    uid: target.uid,
                    character_id: target.character_id,
                } : undefined,
            };
        }

        return {
            bossAction,
            phaseTransition,
        };
    }

    /**
     * 从阶段配置进行简化决策
     */
    private static decideFromPhaseConfig(
        phaseConfig: any,
        context: ExecutionContext
    ): BossAction {
        const { bossState, targets, bossPosition, rng } = context;
        const { behaviorPattern, skillPriorities } = phaseConfig;

        // 选择目标
        const targetStrategy = behaviorPattern?.targetPriority || "nearest";
        const target = TargetSelector.selectTarget(
            targetStrategy,
            targets,
            bossPosition,
            rng
        );

        if (!target) {
            return { type: "standby" };
        }

        // 选择技能
        if (skillPriorities && skillPriorities.length > 0) {
            // 过滤可用技能（冷却完成）
            const availableSkills = skillPriorities.filter((skill: any) => {
                const cooldown = bossState.skillCooldowns?.[skill.skillId] || 0;
                return cooldown === 0;
            });

            if (availableSkills.length > 0) {
                // 根据优先级加权随机选择
                const selectedSkill = this.weightedRandomSelect(availableSkills, rng);

                if (selectedSkill) {
                    return {
                        type: "use_skill",
                        skillId: selectedSkill.skillId,
                        target: {
                            uid: target.uid,
                            character_id: target.character_id,
                        },
                    };
                }
            }
        }

        // 默认攻击
        return {
            type: "attack",
            target: {
                uid: target.uid,
                character_id: target.character_id,
            },
        };
    }

    /**
     * 加权随机选择
     */
    private static weightedRandomSelect(
        items: Array<{ skillId: string; priority: number }>,
        rng: SeededRandom
    ): { skillId: string; priority: number } | null {
        if (!items || items.length === 0) {
            return null;
        }

        const totalPriority = items.reduce((sum, item) => sum + item.priority, 0);
        const random = rng.random() * totalPriority;

        let accumulated = 0;
        for (const item of items) {
            accumulated += item.priority;
            if (random <= accumulated) {
                return item;
            }
        }

        return items[items.length - 1];
    }

    /**
     * 转换ActionResult为BossAction
     */
    private static convertActionResultToAction(result: any): BossAction {
        if (!result) {
            return { type: "standby" };
        }

        switch (result.action) {
            case "use_skill":
                return {
                    type: "use_skill",
                    skillId: result.skillId,
                    target: result.target ? {
                        uid: result.target.uid,
                        character_id: result.target.character_id,
                    } : undefined,
                };

            case "attack":
                return {
                    type: "attack",
                    target: result.target ? {
                        uid: result.target.uid,
                        character_id: result.target.character_id,
                    } : undefined,
                };

            case "move":
                return {
                    type: "move",
                    position: result.position,
                };

            default:
                return { type: "standby" };
        }
    }
}

