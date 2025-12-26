/**
 * 乐观技能执行器
 * 在前端预先执行技能，使用确定性随机数确保与后端结果一致
 */

import { SeededRandom } from "../../utils/seededRandom";
import { GameModel, MonsterSprite } from "../../types/CombatTypes";
import { MonsterSkill } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { SkillManager } from "../SkillManager";
import { StateSnapshot, GameStateSnapshot } from "./StateSnapshot";
import { OperationQueue, PendingOperation } from "./OperationQueue";
import { SkillUseResult } from "./BackendValidator";

export interface OptimisticExecutionResult {
    operationId: string;
    result: SkillUseResult;
    snapshot: GameStateSnapshot | null;
}

export class OptimisticSkillExecutor {
    private operationQueue: OperationQueue;
    private game: GameModel;

    constructor(game: GameModel, operationQueue: OperationQueue) {
        this.game = game;
        this.operationQueue = operationQueue;
    }

    /**
     * 创建操作专用的随机数生成器
     */
    private createOperationRNG(
        gameSeed: string,
        round: number,
        operationIndex: number
    ): SeededRandom {
        const seed = `${gameSeed}_round${round}_op${operationIndex}`;
        return new SeededRandom(seed);
    }

    /**
     * 乐观执行技能
     */
    async executeOptimistically(
        skillId: string,
        caster: MonsterSprite,
        targets: MonsterSprite[],
        gameSeed: string,
        round: number
    ): Promise<OptimisticExecutionResult> {
        // 1. 创建状态快照
        const snapshot = StateSnapshot.createSnapshot(this.game);
        if (!snapshot) {
            throw new Error("Failed to create state snapshot");
        }

        // 2. 获取操作序列号
        const operationIndex = this.operationQueue.getNextOperationIndex();

        // 3. 创建确定性随机数生成器
        const rng = this.createOperationRNG(gameSeed, round, operationIndex);

        // 4. 执行技能（使用前端 SkillManager，但传入 RNG）
        const result = await this.executeSkillWithRNG(
            skillId,
            caster,
            targets,
            rng
        );

        // 5. 创建回滚函数
        const rollback = () => {
            StateSnapshot.restoreSnapshot(this.game, snapshot);
        };

        // 6. 添加到操作队列
        const operationId = this.operationQueue.addOperation({
            type: 'useSkill',
            timestamp: Date.now(),
            snapshot,
            rollback,
            data: {
                skillId,
                caster: caster.character_id,
                targets: targets.map(t => t.character_id),
                result,
            },
        });

        return {
            operationId,
            result,
            snapshot,
        };
    }

    /**
     * 使用确定性随机数执行技能
     */
    private async executeSkillWithRNG(
        skillId: string,
        caster: MonsterSprite,
        targets: MonsterSprite[],
        rng: SeededRandom
    ): Promise<SkillUseResult> {
        const skill = caster.skills?.find(s => s.id === skillId);
        if (!skill) {
            return {
                success: false,
                message: `Skill with ID ${skillId} not found`,
            };
        }

        // 检查冷却和资源（使用后端 SkillManager）
        const availability = SkillManager.checkSkillAvailability(skillId, caster);
        if (!availability.available) {
            return {
                success: false,
                message: availability.reason || `Skill ${skillId} is not available`,
            };
        }

        // 记录资源消耗前状态
        const resourcesBefore = {
            mp: caster.stats?.mp?.current ?? 0,
            hp: caster.stats?.hp?.current ?? 0,
            stamina: caster.stats?.stamina ?? 0,
        };

        // 执行技能（使用后端 SkillManager，传入 RNG）
        SkillManager.useSkill(skillId, caster, targets, undefined, rng);

        // 计算资源消耗
        const resourcesAfter = {
            mp: caster.stats?.mp?.current ?? 0,
            hp: caster.stats?.hp?.current ?? 0,
            stamina: caster.stats?.stamina ?? 0,
        };

        const resourcesConsumed = {
            mp: resourcesBefore.mp - resourcesAfter.mp,
            hp: resourcesBefore.hp - resourcesAfter.hp,
            stamina: resourcesBefore.stamina - resourcesAfter.stamina,
        };

        // 收集应用的效果
        const effects: Array<{ effect: any; targetId?: string; applied: boolean }> = [];
        if (targets.length > 0) {
            targets.forEach(target => {
                // 检查目标是否有新效果
                // 这里简化处理，实际应该对比快照前后的状态
                if (target.statusEffects && target.statusEffects.length > 0) {
                    target.statusEffects.forEach(effect => {
                        effects.push({
                            effect: {
                                id: effect.id,
                                type: effect.type,
                                name: effect.name,
                            },
                            targetId: target.character_id,
                            applied: true,
                        });
                    });
                }
            });
        }

        return {
            success: true,
            message: `Successfully used skill ${skill.name}`,
            cooldownSet: skill.cooldown,
            resourcesConsumed,
            effects,
        };
    }

    /**
     * 获取操作
     */
    getOperation(operationId: string): PendingOperation | undefined {
        return this.operationQueue.getOperation(operationId);
    }
}

