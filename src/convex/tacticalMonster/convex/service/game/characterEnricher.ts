/**
 * 角色数据丰富化工具
 * 负责填充角色缺失的配置字段
 */

import { MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs";
import { GameBoss, GameMinion, GameMonster } from "../../types/monsterTypes";

export class CharacterEnricher {
    /**
     * 完善 Boss 的 GameMonster 字段（填充缺失的配置字段）
     */
    static enrichBossAsGameMonster(boss: GameBoss): GameMonster | null {
        if (!boss || !boss.monsterId) return null;

        // 如果已经包含所有必需字段，直接返回
        if (boss.name && boss.rarity && boss.assetPath) {
            return boss as GameMonster;
        }

        // 否则从配置填充缺失字段
        const monsterConfig = MONSTER_CONFIGS_MAP[boss.monsterId];
        if (!monsterConfig) {
            // 如果没有配置，使用默认值
            return {
                ...boss,
                uid: boss.uid || "boss",
                name: boss.monsterId,
                rarity: "Common" as const,
                level: boss.level ?? 1,
                stars: boss.stars ?? 1,
                assetPath: "",
                status: boss.status || "normal",
            } as GameMonster;
        }

        return {
            ...boss,
            uid: boss.uid || "boss",
            name: monsterConfig.name,
            rarity: monsterConfig.rarity,
            class: monsterConfig.class,
            race: monsterConfig.race,
            assetPath: monsterConfig.assetPath,
            level: boss.level ?? 1,
            stars: boss.stars ?? 1,
            move_range: boss.move_range ?? monsterConfig.moveRange,
            attack_range: boss.attack_range ?? monsterConfig.attackRange,
            isFlying: boss.isFlying ?? (monsterConfig.race === "Flying"),
            flightHeight: boss.flightHeight ?? (monsterConfig.race === "Flying" ? 1.5 : undefined),
            canIgnoreObstacles: boss.canIgnoreObstacles ?? (monsterConfig.race === "Flying"),
            status: boss.status || "normal",
        } as GameMonster;
    }

    /**
     * 完善小怪的 GameMonster 字段（填充缺失的配置字段）
     */
    static enrichMinionAsGameMonster(minion: GameMinion): GameMonster | null {
        if (!minion || !minion.monsterId) return null;

        // 如果已经包含所有必需字段，直接返回
        if (minion.name && minion.rarity && minion.assetPath && minion.stats) {
            return minion as GameMonster;
        }

        // 否则从配置填充缺失字段
        const monsterConfig = MONSTER_CONFIGS_MAP[minion.monsterId];
        if (!monsterConfig) {
            // 如果没有配置，使用默认值
            return {
                ...minion,
                uid: minion.uid || "boss",
                name: minion.monsterId,
                rarity: "Common" as const,
                level: minion.level ?? 1,
                stars: minion.stars ?? 1,
                assetPath: "",
                stats: minion.stats || {
                    hp: { current: 0, max: 0 },
                    attack: 0,
                    defense: 0,
                    speed: 0,
                },
                status: minion.status || "normal",
            } as GameMonster;
        }

        return {
            ...minion,
            uid: minion.uid || "boss",
            name: monsterConfig.name,
            rarity: monsterConfig.rarity,
            class: monsterConfig.class,
            race: monsterConfig.race,
            assetPath: monsterConfig.assetPath,
            level: minion.level ?? 1,
            stars: minion.stars ?? 1,
            stats: minion.stats || {
                hp: { current: 0, max: 0 },
                attack: 0,
                defense: 0,
                speed: 0,
            },
            move_range: minion.move_range ?? monsterConfig.moveRange,
            attack_range: minion.attack_range ?? monsterConfig.attackRange,
            isFlying: minion.isFlying ?? (monsterConfig.race === "Flying"),
            flightHeight: minion.flightHeight ?? (monsterConfig.race === "Flying" ? 1.5 : undefined),
            canIgnoreObstacles: minion.canIgnoreObstacles ?? (monsterConfig.race === "Flying"),
            status: minion.status || "normal",
        } as GameMonster;
    }
}

