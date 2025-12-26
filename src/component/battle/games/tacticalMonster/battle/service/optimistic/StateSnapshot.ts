/**
 * 状态快照管理器
 * 用于保存和恢复游戏状态，支持乐观更新的回滚
 */

import { GameModel, MonsterSprite } from "../../types/CombatTypes";
import { getCharactersFromGameModel } from "../../utils/typeAdapter";

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
        if (!game || !game.team || !game.boss) {
            return null;
        }

        // 从 team 和 boss 生成 characters，然后深拷贝
        const characters = getCharactersFromGameModel(game.team, game.boss);
        const clonedCharacters = characters.map(char => this.deepCloneCharacter(char));

        return {
            characters: clonedCharacters,
            timestamp: Date.now(),
            round: game.currentRound?.no,
            score: game.score,
        };
    }

    /**
     * 恢复状态快照
     * 注意：由于 GameModel 不再包含 characters，我们需要将快照中的 characters 转换回 team 和 boss
     * 这里我们直接更新 team 和 boss 的字段（stats, statusEffects等）
     */
    static restoreSnapshot(game: GameModel, snapshot: GameStateSnapshot): void {
        if (!game || !snapshot) {
            return;
        }

        // 将快照中的 characters 转换回 team 和 boss
        // 更新 team 中的角色状态
        if (game.team && snapshot.characters) {
            snapshot.characters.forEach(char => {
                if (char.uid !== "boss") {
                    const teamMember = game.team.find(m => m.monsterId === char.monsterId);
                    if (teamMember) {
                        // 更新状态
                        teamMember.stats = char.stats;
                        teamMember.statusEffects = char.statusEffects;
                        teamMember.skillCooldowns = char.skillCooldowns;
                        teamMember.q = char.q;
                        teamMember.r = char.r;
                    }
                }
            });
        }

        // 更新 boss 状态
        if (game.boss && snapshot.characters) {
            const bossChar = snapshot.characters.find(c => c.uid === "boss" && !('minionId' in c));
            if (bossChar) {
                game.boss.stats = bossChar.stats;
                game.boss.statusEffects = bossChar.statusEffects;
                game.boss.skillCooldowns = bossChar.skillCooldowns;
                game.boss.q = bossChar.q;
                game.boss.r = bossChar.r;
            }

            // 更新 minions
            if (game.boss.minions) {
                snapshot.characters.forEach(char => {
                    if (char.uid === "boss" && 'minionId' in char) {
                        const minion = game.boss.minions?.find(m => (m as any).minionId === (char as any).minionId);
                        if (minion) {
                            minion.stats = char.stats;
                            minion.statusEffects = char.statusEffects;
                            minion.skillCooldowns = char.skillCooldowns;
                            minion.q = char.q;
                            minion.r = char.r;
                        }
                    }
                });
            }
        }

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
            skills: char.skills ? char.skills.map(skill => ({ ...skill })) : [],
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

