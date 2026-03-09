/**
 * Boss AI服务
 * 主AI决策服务，整合所有AI组件
 */

import { getMergedBossConfig } from "../../../data/bossConfigs";
import { MONSTER_CONFIGS_MAP } from "../../../data/monsterConfigs";
import type { BossAction, BossAIDecision, CharacterIdentifier } from "../../../types/gameTypes";
import { getNeighbors, offsetHexDistance } from "../../../utils/hexUtils";
import { SeededRandom } from "../../../utils/seededRandom";
import { BehaviorTreeExecutor, ExecutionContext } from "./behaviorTreeExecutor";
import { BossState, GameState } from "./conditionEvaluator";
import { PhaseManager } from "./phaseManager";
import { TargetCharacter, TargetSelector } from "./targetSelector";

// 从 types/gameTypes 统一导出，供其他模块使用
export type { BossAction, BossAIDecision };

export class BossAIService {
    /**
     * 辅助方法：将 TargetCharacter 转换为 CharacterIdentifier
     * 由于 TargetCharacter 来自玩家队伍，所以都是玩家角色（使用 monsterId）
     * @param target TargetCharacter 对象
     * @returns CharacterIdentifier
     */
    private static convertTargetToIdentifier(target: TargetCharacter): CharacterIdentifier {
        if (!target.character_id) {
            throw new Error("TargetCharacter 缺少 character_id 字段");
        }

        // 玩家角色使用 monsterId（TargetCharacter 来自玩家队伍）
        return {
            monsterId: target.character_id,
        };
    }

    /**
     * 决策Boss下一回合的行为
     * @param ctx Convex context
     * @param params 决策参数
     * @returns Boss AI决策结果
     */
    static async decideBossAction(
        ctx: any,
        params: {
            gameId: string;
            round: number;
        }
    ): Promise<BossAIDecision> {
        // 1. 从 mr_games 获取游戏数据（包含 Boss 信息）
        const game = await ctx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", params.gameId))
            .first();

        if (!game) {
            throw new Error(`游戏不存在: ${params.gameId}`);
        }

        if (!game.boss) {
            throw new Error(`游戏 ${params.gameId} 没有Boss数据`);
        }

        const bossMain = game.boss;

        // mr_games.boss 可能未存 bossId，用 monsterId 作为回退（用于实体标识）
        const bossId = (bossMain as any).bossId ?? bossMain.monsterId;
        if (!bossId) {
            throw new Error(`Boss缺少bossId标识符`);
        }

        // 2. 检查Boss是否存活
        if (!bossMain.stats?.hp?.current) {
            throw new Error(`Boss缺少stats.hp.current数据`);
        }

        const currentHp = bossMain.stats.hp.current;
        if (currentHp <= 0) {
            return {
                bossAction: { type: "standby" },
            };
        }

        // 3. 获取Boss配置（配置按 stage.bossId 存储，如 boss_bronze_1，需用 stage 查）
        const stage = await ctx.db
            .query("mr_stage")
            .withIndex("by_stageId", (q: any) => q.eq("stageId", game.stageId))
            .first();
        const configBossId = stage?.bossId ?? bossId;
        const bossConfig = getMergedBossConfig(configBossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${configBossId}`);
        }

        // 4. 获取 behaviorSeed
        if (!bossMain.behaviorSeed) {
            throw new Error(`Boss缺少behaviorSeed`);
        }
        const behaviorSeed = bossMain.behaviorSeed;

        // 5. 获取玩家角色（敌人）- 从 mr_games.team 字段获取
        if (!game.team || game.team.length === 0) {
            throw new Error(`游戏 ${params.gameId} 没有玩家队伍数据`);
        }

        const targets: TargetCharacter[] = game.team
            .filter((member: any) => {
                if (!member.stats?.hp?.current) {
                    return false;
                }
                return member.stats.hp.current > 0;  // 过滤掉已死亡的成员
            })
            .map((member: any) => {
                if (!member.monsterId) {
                    throw new Error(`队伍成员缺少monsterId`);
                }
                if (!member.stats?.hp) {
                    throw new Error(`队伍成员 ${member.monsterId} 缺少stats.hp数据`);
                }
                if (member.q === undefined || member.r === undefined) {
                    throw new Error(`队伍成员 ${member.monsterId} 缺少位置信息`);
                }
                if (!member.uid) {
                    throw new Error(`队伍成员 ${member.monsterId} 缺少uid`);
                }

                return {
                    uid: member.uid,
                    character_id: (member as any).character_id ?? member.monsterId,
                    q: member.q,
                    r: member.r,
                    currentHp: member.stats.hp.current,
                    maxHp: member.stats.hp.max,
                    totalDamage: 0,  // TODO: 从游戏记录中获取
                    threatValue: 0,
                };
            });

        // 6. 构建Boss状态
        if (!bossMain.stats?.hp?.max) {
            throw new Error(`Boss缺少stats.hp.max数据`);
        }

        const maxHp = bossMain.stats.hp.max;
        const bossState: BossState = {
            currentHp,
            maxHp,
            skillCooldowns: bossMain.skillCooldowns || {},
            statusEffects: bossMain.statusEffects || [],
        };

        // 7. 检查阶段转换
        if (!bossMain.currentPhase) {
            throw new Error(`Boss缺少currentPhase数据`);
        }
        const currentPhase = bossMain.currentPhase;
        let phaseTransition = undefined;
        if (bossConfig.phases && bossConfig.phases.length > 0) {
            const phaseCheck = PhaseManager.checkPhaseTransition(
                bossState.currentHp,
                bossState.maxHp,
                bossConfig.phases,
                currentPhase
            );

            if (phaseCheck.shouldTransition && phaseCheck.newPhase) {
                // 更新阶段（Convex patch 不支持点号，需替换整个 boss 对象）
                const existingBoss = game.boss || {};
                await ctx.db.patch(game._id, {
                    boss: { ...existingBoss, currentPhase: phaseCheck.newPhase },
                    lastUpdate: new Date().toISOString(),
                });

                phaseTransition = {
                    fromPhase: currentPhase,
                    toPhase: phaseCheck.newPhase,
                };
            }
        }

        // 8. 获取当前阶段配置
        const phaseConfig = bossConfig.phases?.find(p => p.phaseName === currentPhase);

        // 9. 准备执行上下文（位置：DB boss → 配置默认 → 0,0）
        const bossQ = (bossMain as any).q ?? (bossMain as any).position?.q ?? (bossConfig as any).position?.q ?? 0;
        const bossR = (bossMain as any).r ?? (bossMain as any).position?.r ?? (bossConfig as any).position?.r ?? 0;
        const bossPosition = { q: bossQ, r: bossR };
        const minionCount = game.boss.minions?.length || 0;
        const gameState: GameState = {
            round: params.round,
            seed: behaviorSeed,
            playerCount: targets.length,
            enemyCount: targets.length,
            minionCount: minionCount,
        };

        // 计算到最近敌人的距离
        if (targets.length > 0) {
            const nearest = TargetSelector.selectTarget(
                "nearest",
                targets,
                bossPosition
            );
            if (nearest) {
                gameState.distanceToNearest = offsetHexDistance(
                    bossPosition,
                    { q: nearest.q, r: nearest.r }
                );
            }
        }

        const rng = new SeededRandom(
            `${behaviorSeed}_round_${params.round}`
        );

        const context: ExecutionContext = {
            bossState,
            gameState,
            targets,
            bossPosition,
            rng,
        };

        // 10. 执行行为树或使用阶段配置
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
            // 默认行为：能攻击则攻击，否则向最近敌人移动一步（攻击前有移动）
            const target = TargetSelector.selectTarget(
                "nearest",
                targets,
                bossPosition,
                rng
            );
            if (!target) {
                bossAction = { type: "standby" };
            } else {
                const monsterConfig = MONSTER_CONFIGS_MAP[bossConfig.monsterId];
                const moveRange = (bossMain as any).move_range ?? monsterConfig?.moveRange ?? 3;
                const attackRange = (bossMain as any).attack_range ?? monsterConfig?.attackRange ?? { min: 1, max: 2 };
                const attackMax = (typeof attackRange === "object" && attackRange != null && "max" in attackRange)
                    ? (attackRange as { max?: number }).max ?? 2
                    : 2;
                const distToTarget = offsetHexDistance(bossPosition, { q: target.q, r: target.r });

                if (distToTarget <= attackMax) {
                    bossAction = {
                        type: "attack",
                        target: this.convertTargetToIdentifier(target),
                    };
                } else if (moveRange >= 1) {
                    // 向最近目标移动一步：在合法邻格中选离目标最近的一格
                    const occupied = new Set(targets.map((t) => `${t.q},${t.r}`));
                    const map = game.map;
                    const rows = map?.rows ?? 20;
                    const cols = map?.cols ?? 20;
                    const obstacles = new Set(
                        (map?.obstacles ?? []).map((o: { q: number; r: number }) => `${o.q},${o.r}`)
                    );
                    const disables = new Set(
                        (map?.disables ?? []).map((d: { q: number; r: number }) => `${d.q},${d.r}`)
                    );
                    const targetPos = { q: target.q, r: target.r };
                    const neighbors = getNeighbors(bossPosition);
                    let best: { q: number; r: number } | null = null;
                    let bestDist = Infinity;
                    for (const cell of neighbors) {
                        if (cell.q < 0 || cell.r < 0 || cell.q >= cols || cell.r >= rows) continue;
                        const key = `${cell.q},${cell.r}`;
                        if (obstacles.has(key) || disables.has(key) || occupied.has(key)) continue;
                        const d = offsetHexDistance(cell, targetPos);
                        if (d < bestDist) {
                            bestDist = d;
                            best = cell;
                        }
                    }
                    if (best) {
                        bossAction = { type: "move", position: best };
                    } else {
                        bossAction = { type: "standby" };
                    }
                } else {
                    bossAction = { type: "standby" };
                }
            }
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
                        target: this.convertTargetToIdentifier(target),
                    };
                }
            }
        }

        // 默认攻击
        return {
            type: "attack",
            target: this.convertTargetToIdentifier(target),
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
                    target: result.target ? this.convertTargetToIdentifier(result.target) : undefined,
                };

            case "attack":
                return {
                    type: "attack",
                    target: result.target ? this.convertTargetToIdentifier(result.target) : undefined,
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

