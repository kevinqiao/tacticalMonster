/**
 * 角色查询服务
 * 负责角色查询和标识符转换
 */

import { GameBoss, GameMinion, GameMonster } from "../../types/monsterTypes";
import { GameModel } from "../../types/gameTypes";
import { CharacterEnricher } from "./characterEnricher";

export class CharacterQueryService {
    private game: GameModel | null = null;

    /**
     * 设置当前游戏状态
     */
    setGame(game: GameModel | null): void {
        this.game = game;
    }

    /**
     * 根据标识符获取 GameMonster
     * 
     * 查找规则：
     * - 如果提供了 monsterId：查找玩家角色（玩家队伍中的monster不会重复）
     * - 如果提供了 bossId：查找Boss主体
     * - 如果提供了 minionId：查找小怪（小怪的monsterId可能重复，必须使用minionId）
     * 
     * 注意：三个参数每次只有一个存在，用来区分角色类型
     * 
     * @param monsterId 玩家角色的monsterId（可选）
     * @param bossId Boss的bossId（可选）
     * @param minionId 小怪的minionId（可选）
     * @returns GameMonster 或 null
     */
    getCharacter(
        monsterId?: string,
        bossId?: string,
        minionId?: string
    ): GameMonster | null {
        if (!this.game) return null;

        // 检查参数：应该只有一个存在
        const paramCount = [monsterId, bossId, minionId].filter(Boolean).length;
        if (paramCount !== 1) {
            return null;  // 参数错误：应该只有一个标识符
        }

        if (bossId) {
            // Boss主体：使用 bossId 定位
            if (bossId === this.game.boss.bossId) {
                return CharacterEnricher.enrichBossAsGameMonster(this.game.boss);
            }
            return null;
        } else if (minionId) {
            // 小怪：使用 minionId 定位（小怪的monsterId可能重复）
            const minion = this.game.boss.minions.find((m) => m.minionId === minionId);
            return minion ? CharacterEnricher.enrichMinionAsGameMonster(minion) : null;
        } else if (monsterId) {
            // 玩家角色：支持实例 id（character_id）与类型 id（monsterId），以区分同 monsterId 多单位（如召唤）
            const byInstanceOrType = this.game.team.find((m: any) =>
                (m.character_id ?? m.monsterId) === monsterId
            );
            if (byInstanceOrType) return byInstanceOrType;
            // 回退：回合里 character_id 与 mr_games.team 快照不一致时（仅存 monsterId），仍可按类型 id 命中
            return this.game.team.find((m: any) => m.monsterId === monsterId) || null;
        }

        return null;
    }

    /**
     * 从 { uid, monsterId } 格式转换为 getCharacter 的参数
     * 用于兼容现有的接口格式
     * 
     * 转换规则：
     * - uid !== "boss": monsterId（玩家角色）
     * - uid === "boss": 根据 monsterId 是否等于 boss.bossId 判断是Boss主体还是小怪
     *   - 如果等于 boss.bossId: bossId
     *   - 否则: minionId
     * 
     * @param uid 角色UID（玩家UID或"boss"）
     * @param monsterId 标识符（根据uid不同，实际含义不同）
     * @returns getCharacter 的参数对象
     */
    getCharacterParams(uid: string, monsterId: string): {
        monsterId?: string;
        bossId?: string;
        minionId?: string;
    } {
        if (uid === "boss") {
            // 判断是Boss主体还是小怪
            // 优先检查是否匹配Boss的bossId
            if (this.game && this.game.boss && monsterId === this.game.boss.bossId) {
                return { bossId: monsterId };
            } else {
                // 否则认为是小怪的minionId
                return { minionId: monsterId };
            }
        } else {
            // 玩家角色：使用monsterId
            return { monsterId };
        }
    }

    /**
     * 获取所有可攻击的角色（玩家队伍 + Boss + 小怪）
     * @returns 所有角色的数组
     */
    getAllCharacters(): GameMonster[] {
        if (!this.game) return [];

        const allCharacters: GameMonster[] = [];

        // 添加玩家队伍
        allCharacters.push(...this.game.team);

        // 添加Boss本体
        const bossMonster = CharacterEnricher.enrichBossAsGameMonster(this.game.boss);
        if (bossMonster) {
            allCharacters.push(bossMonster);
        }

        // 添加小怪
        for (const minion of this.game.boss.minions) {
            const minionMonster = CharacterEnricher.enrichMinionAsGameMonster(minion);
            if (minionMonster) {
                allCharacters.push(minionMonster);
            }
        }

        return allCharacters;
    }
}

