/**
 * 乐观Boss AI执行器
 * 在前端预先执行Boss AI动作，使用确定性随机数确保与后端结果一致
 */

import { GameModel, MonsterSprite } from "../../types/CombatTypes";
import { SeededRandom } from "../../utils/seededRandom";
import { getCharactersFromGameModel } from "../../utils/typeAdapter";
import { BossAction, BossAIDecision } from "../boss/BossAILocal";
import { SkillManager } from "../SkillManager";
import { OperationQueue, PendingOperation } from "./OperationQueue";
import { GameStateSnapshot, StateSnapshot } from "./StateSnapshot";

export interface OptimisticBossExecutionResult {
    operationId: string;
    decision: BossAIDecision;
    snapshot: GameStateSnapshot | null;
}

export class OptimisticBossExecutor {
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
        const seed = `${gameSeed}_round_${round}_op${operationIndex}`;
        return new SeededRandom(seed);
    }

    /**
     * 乐观执行Boss动作
     */
    async executeOptimistically(
        decision: BossAIDecision,
        bossCharacter: MonsterSprite,
        gameSeed: string,
        round: number
    ): Promise<OptimisticBossExecutionResult> {
        // 1. 创建状态快照
        const snapshot = StateSnapshot.createSnapshot(this.game);
        if (!snapshot) {
            throw new Error("Failed to create state snapshot");
        }

        // 2. 获取操作序列号
        const operationIndex = this.operationQueue.getNextOperationIndex();

        // 3. 创建确定性随机数生成器
        const rng = this.createOperationRNG(gameSeed, round, operationIndex);

        // 4. 执行Boss动作
        await this.executeBossAction(decision.bossAction, bossCharacter, rng);

        // 5. 创建回滚函数
        const rollback = () => {
            StateSnapshot.restoreSnapshot(this.game, snapshot);
        };

        // 6. 添加到操作队列
        const operationId = this.operationQueue.addOperation({
            type: 'attack', // Boss动作统一使用attack类型（实际会根据action.type区分）
            timestamp: Date.now(),
            snapshot,
            rollback,
            data: {
                decision,
                bossCharacterId: bossCharacter.character_id,
            },
        });

        return {
            operationId,
            decision,
            snapshot,
        };
    }

    /**
     * 执行Boss动作（内部方法）
     */
    private async executeBossAction(
        action: BossAction,
        bossCharacter: MonsterSprite,
        rng: SeededRandom
    ): Promise<void> {
        switch (action.type) {
            case 'use_skill':
                if (action.skillId) {
                    // 找到目标角色
                    const targets: MonsterSprite[] = [];
                    if (action.target) {
                        // BossAction.target 是 { uid: string; character_id: string }
                        const target = this.findCharacterByCharacterId(action.target.character_id);
                        if (target) {
                            targets.push(target);
                        }
                    }

                    // 使用技能（传入 RNG）
                    if (targets.length > 0) {
                        SkillManager.useSkill(action.skillId, bossCharacter, targets, undefined, rng);
                    }
                }
                break;

            case 'attack':
                // 普通攻击（简化实现，实际应该调用攻击逻辑）
                if (action.target) {
                    // BossAction.target 是 { uid: string; character_id: string }
                    const target = this.findCharacterByCharacterId(action.target.character_id);
                    if (target && bossCharacter.stats?.hp && target.stats?.hp) {
                        // 计算伤害（简化版）
                        const attack = bossCharacter.stats.attack || 0;
                        const defense = target.stats.defense || 0;
                        const damage = Math.max(1, Math.floor(attack - defense * 0.3));

                        // 应用伤害
                        target.stats.hp.current = Math.max(0, target.stats.hp.current - damage);
                    }
                }
                break;

            case 'move':
                // 移动（更新位置）
                if (action.position) {
                    bossCharacter.q = action.position.q;
                    bossCharacter.r = action.position.r;
                }
                break;

            case 'standby':
                // 待命，不做任何操作
                break;
        }
    }

    /**
     * 根据 character_id 查找角色
     */
    private findCharacterByCharacterId(characterId: string): MonsterSprite | undefined {
        if (!this.game.team || !this.game.boss) {
            return undefined;
        }

        const characters = getCharactersFromGameModel(this.game.team, this.game.boss);
        return characters.find(c => c.character_id === characterId);
    }

    /**
     * 获取操作
     */
    getOperation(operationId: string): PendingOperation | undefined {
        return this.operationQueue.getOperation(operationId);
    }
}

