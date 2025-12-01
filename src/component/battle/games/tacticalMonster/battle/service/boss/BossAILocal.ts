/**
 * Boss AI本地预测服务
 * 与后端使用相同的决策逻辑，确保前后端决策一致
 */

import { SeededRandom } from "../../utils/seededRandom";
import { calculateHexDistance } from "../../utils/hexUtil";

export interface BossAction {
    type: "use_skill" | "attack" | "move" | "standby";
    skillId?: string;
    target?: {
        uid: string;
        character_id: string;
    };
    position?: { q: number; r: number };
}

export interface BossState {
    currentHp: number;
    maxHp: number;
    skillCooldowns?: Record<string, number>;
    statusEffects?: any[];
}

export interface GameState {
    round: number;
    seed?: string;
    playerCount?: number;
    enemyCount?: number;
    minionCount?: number;
    distanceToNearest?: number;
}

export interface TargetCharacter {
    uid: string;
    character_id: string;
    q: number;
    r: number;
    currentHp: number;
    maxHp: number;
    totalDamage?: number;
    threatValue?: number;
}

export interface BossAIDecision {
    bossAction: BossAction;
    phaseTransition?: {
        fromPhase: string;
        toPhase: string;
    };
}

/**
 * Boss AI本地决策服务
 * 实现与后端相同的决策逻辑
 */
export class BossAILocal {
    /**
     * 决策Boss下一回合的行为（本地预测版本）
     * 与后端BossAIService使用相同的逻辑
     */
    static decideBossAction(
        params: {
            behaviorSeed: string;
            round: number;
            bossState: BossState;
            gameState: GameState;
            targets: TargetCharacter[];
            bossPosition: { q: number; r: number };
            phaseConfig?: any;
            bossConfig?: any;
        }
    ): BossAIDecision {
        const { behaviorSeed, round, bossState, gameState, targets, bossPosition, phaseConfig } = params;

        // 使用相同种子生成随机数
        const seed = `${behaviorSeed}_round_${round}`;
        const rng = new SeededRandom(seed);

        // 如果没有目标，待命
        if (!targets || targets.length === 0) {
            return {
                bossAction: { type: "standby" },
            };
        }

        // 选择最近的目标（简化版，与后端保持一致）
        const nearestTarget = this.selectNearestTarget(targets, bossPosition);

        if (!nearestTarget) {
            return {
                bossAction: { type: "standby" },
            };
        }

        // 简化决策逻辑（与后端一致）
        // 优先使用技能，然后攻击，最后移动
        let bossAction: BossAction;

        // 检查是否有可用技能
        const availableSkills = phaseConfig?.skillPriorities?.filter((skill: any) => {
            const cooldown = bossState.skillCooldowns?.[skill.skillId] || 0;
            return cooldown === 0;
        }) || [];

        if (availableSkills.length > 0) {
            // 加权随机选择技能
            const selectedSkill = this.weightedRandomSelect(availableSkills, rng);
            if (selectedSkill) {
                bossAction = {
                    type: "use_skill",
                    skillId: selectedSkill.skillId,
                    target: {
                        uid: nearestTarget.uid,
                        character_id: nearestTarget.character_id,
                    },
                };
            } else {
                bossAction = {
                    type: "attack",
                    target: {
                        uid: nearestTarget.uid,
                        character_id: nearestTarget.character_id,
                    },
                };
            }
        } else {
            // 默认攻击
            bossAction = {
                type: "attack",
                target: {
                    uid: nearestTarget.uid,
                    character_id: nearestTarget.character_id,
                },
            };
        }

        return {
            bossAction,
        };
    }

    /**
     * 选择最近的敌人
     */
    private static selectNearestTarget(
        targets: TargetCharacter[],
        bossPosition: { q: number; r: number }
    ): TargetCharacter | null {
        if (!targets || targets.length === 0) return null;

        // 过滤掉已死亡的敌人
        const aliveTargets = targets.filter(t => t.currentHp > 0);
        if (aliveTargets.length === 0) return null;

        return aliveTargets.reduce((nearest, target) => {
            if (!nearest) return target;

            const nearestDist = calculateHexDistance(
                { q: nearest.q, r: nearest.r },
                bossPosition
            );
            const targetDist = calculateHexDistance(
                { q: target.q, r: target.r },
                bossPosition
            );

            return targetDist < nearestDist ? target : nearest;
        });
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

        const totalPriority = items.reduce((sum, item) => sum + (item.priority || 1), 0);
        const random = rng.random() * totalPriority;

        let accumulated = 0;
        for (const item of items) {
            accumulated += item.priority || 1;
            if (random <= accumulated) {
                return item;
            }
        }

        return items[items.length - 1];
    }

    /**
     * 检查决策一致性
     * 用于验证前端预测与后端结果是否一致
     */
    static isDecisionConsistent(
        predicted: BossAction,
        server: BossAction,
        tolerance: { targetChange: boolean } = { targetChange: false }
    ): boolean {
        // 类型必须一致
        if (predicted.type !== server.type) {
            return false;
        }

        // 如果是技能，技能ID必须一致
        if (predicted.type === "use_skill" && server.type === "use_skill") {
            if (predicted.skillId !== server.skillId) {
                return false;
            }
        }

        // 检查目标（允许目标变化，因为可能目标已死亡）
        if (predicted.target && server.target) {
            if (predicted.target.character_id !== server.target.character_id) {
                if (!tolerance.targetChange) {
                    return false;
                }
                // 目标变化可以接受（如目标已死亡，重新选择）
            }
        }

        // 检查位置（移动动作）
        if (predicted.type === "move" && server.type === "move") {
            if (predicted.position && server.position) {
                if (
                    predicted.position.q !== server.position.q ||
                    predicted.position.r !== server.position.r
                ) {
                    return false;
                }
            }
        }

        return true;
    }
}

