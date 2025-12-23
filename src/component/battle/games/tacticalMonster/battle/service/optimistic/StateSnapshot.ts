/**
 * 状态快照管理器
 * 用于保存和恢复游戏状态，支持乐观更新的回滚
 */

import { GameModel, MonsterSprite } from "../../types/CombatTypes";

export interface GameStateSnapshot {
    characters: MonsterSprite[];    // 角色状态快照（深拷贝）
    timestamp: number;              // 快照时间
    round?: number;                 // 回合号
    score?: number;                 // 分数
}

export class StateSnapshot {
    /**
     * 创建状态快照（深拷贝）
     */
    static createSnapshot(game: GameModel | null): GameStateSnapshot | null {
        if (!game || !game.characters) {
            return null;
        }

        // 深拷贝角色状态
        const characters = game.characters.map(char => this.deepCloneCharacter(char));

        return {
            characters,
            timestamp: Date.now(),
            round: game.currentRound?.no,
            score: game.score,
        };
    }

    /**
     * 恢复状态快照
     */
    static restoreSnapshot(game: GameModel, snapshot: GameStateSnapshot): void {
        if (!game || !snapshot) {
            return;
        }

        // 恢复角色状态
        game.characters = snapshot.characters.map(char => this.deepCloneCharacter(char));

        // 恢复其他状态
        if (snapshot.score !== undefined) {
            game.score = snapshot.score;
        }
    }

    /**
     * 深拷贝角色
     */
    private static deepCloneCharacter(char: MonsterSprite): MonsterSprite {
        // 深拷贝基础字段
        // stats 是必需的，如果不存在则创建默认值
        const cloned: MonsterSprite = {
            ...char,
            stats: char.stats ? {
                ...char.stats,
                hp: char.stats.hp ? { ...char.stats.hp } : { current: 0, max: 0 },
                mp: char.stats.mp ? { ...char.stats.mp } : undefined,
                shield: char.stats.shield ? { ...char.stats.shield } : undefined,
            } : {
                // 默认 stats（必需字段）
                hp: { current: 0, max: 0 },
                attack: 0,
                defense: 0,
                speed: 0,
            },
            skillCooldowns: char.skillCooldowns ? { ...char.skillCooldowns } : undefined,
            statusEffects: char.statusEffects ? char.statusEffects.map(effect => ({ ...effect })) : undefined,
            skills: char.skills ? char.skills.map(skill => ({ ...skill })) : undefined,
            // UI相关字段不需要深拷贝（这些是引用）
            walkables: char.walkables,
            attackables: char.attackables,
        };

        return cloned;
    }

    /**
     * 对比两个快照是否相同（用于调试）
     */
    static compareSnapshots(snapshot1: GameStateSnapshot, snapshot2: GameStateSnapshot): boolean {
        if (snapshot1.characters.length !== snapshot2.characters.length) {
            return false;
        }

        for (let i = 0; i < snapshot1.characters.length; i++) {
            const char1 = snapshot1.characters[i];
            const char2 = snapshot2.characters[i];

            if (char1.character_id !== char2.character_id) {
                return false;
            }

            // 对比关键状态
            if (char1.stats?.hp?.current !== char2.stats?.hp?.current) {
                return false;
            }

            if (char1.stats?.mp?.current !== char2.stats?.mp?.current) {
                return false;
            }

            if ((char1.statusEffects?.length || 0) !== (char2.statusEffects?.length || 0)) {
                return false;
            }
        }

        return true;
    }
}

