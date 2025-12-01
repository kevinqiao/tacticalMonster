/**
 * 条件评估器
 * 评估各种条件是否满足
 */

import { SeededRandom } from "../../../utils/seededRandom";

export interface Condition {
    type: "hp_percentage" | "round_count" | "player_count" | "status_effect" | 
          "random" | "enemy_count" | "cooldown" | "minion_count" | 
          "distance_to_nearest" | "skill_available";
    value: any;
    operator?: "eq" | "gt" | "lt" | "gte" | "lte" | "in";
    probability?: number;
}

export interface GameState {
    round: number;
    seed?: string;
    playerCount?: number;
    enemyCount?: number;
    minionCount?: number;
    distanceToNearest?: number;
}

export interface BossState {
    currentHp: number;
    maxHp: number;
    skillCooldowns?: Record<string, number>;
    statusEffects?: any[];
}

export class ConditionEvaluator {
    /**
     * 评估单个条件
     */
    static evaluateCondition(
        condition: Condition,
        bossState: BossState,
        gameState: GameState,
        rng?: SeededRandom
    ): boolean {
        switch (condition.type) {
            case "hp_percentage": {
                const hpPercentage = bossState.currentHp / bossState.maxHp;
                return this.compareValues(hpPercentage, condition.operator || "lt", condition.value);
            }

            case "round_count": {
                return this.compareValues(
                    gameState.round || 0,
                    condition.operator || "gte",
                    condition.value
                );
            }

            case "player_count": {
                return this.compareValues(
                    gameState.playerCount || 0,
                    condition.operator || "gt",
                    condition.value
                );
            }

            case "enemy_count": {
                return this.compareValues(
                    gameState.enemyCount || 0,
                    condition.operator || "gt",
                    condition.value
                );
            }

            case "minion_count": {
                return this.compareValues(
                    gameState.minionCount || 0,
                    condition.operator || "eq",
                    condition.value
                );
            }

            case "distance_to_nearest": {
                return this.compareValues(
                    gameState.distanceToNearest || 999,
                    condition.operator || "lt",
                    condition.value
                );
            }

            case "cooldown": {
                const skillId = condition.value.skillId || condition.value;
                const cooldown = bossState.skillCooldowns?.[skillId] || 0;
                return cooldown === 0;
            }

            case "skill_available": {
                const skillId = condition.value.skillId || condition.value;
                const cooldown = bossState.skillCooldowns?.[skillId] || 0;
                return cooldown === 0 && condition.value.available !== false;
            }

            case "random": {
                if (!rng) {
                    rng = new SeededRandom(gameState.seed || `random_${Date.now()}`);
                }
                const probability = condition.probability !== undefined ? condition.probability : 0.5;
                return rng.chance(probability);
            }

            case "status_effect": {
                const effectType = condition.value?.type || condition.value;
                return bossState.statusEffects?.some(
                    (effect: any) => effect.type === effectType
                ) || false;
            }

            default:
                return false;
        }
    }

    /**
     * 评估多个条件（AND逻辑）
     */
    static evaluateConditions(
        conditions: Condition[],
        bossState: BossState,
        gameState: GameState,
        rng?: SeededRandom
    ): boolean {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        for (const condition of conditions) {
            if (!this.evaluateCondition(condition, bossState, gameState, rng)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 比较值
     */
    private static compareValues(
        actual: number,
        operator: "eq" | "gt" | "lt" | "gte" | "lte",
        expected: number
    ): boolean {
        switch (operator) {
            case "eq":
                return actual === expected;
            case "gt":
                return actual > expected;
            case "lt":
                return actual < expected;
            case "gte":
                return actual >= expected;
            case "lte":
                return actual <= expected;
            default:
                return false;
        }
    }
}

