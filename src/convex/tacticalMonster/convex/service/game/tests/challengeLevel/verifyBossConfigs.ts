/**
 * 验证Boss配置是否正确引用monsterId
 */

import { BOSS_CONFIGS } from "../../../../data/bossConfigs";
import { MONSTER_CONFIGS } from "../../../../data/monsterConfigs";

/**
 * 验证所有Boss配置的characterId引用的monsterId是否存在
 */
export function verifyBossConfigs(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    const bossIds = Object.keys(BOSS_CONFIGS);

    for (const bossId of bossIds) {
        const bossConfig = BOSS_CONFIGS[bossId];
        const characterId = bossConfig.characterId;

        // 验证characterId引用的monsterId是否存在
        if (!MONSTER_CONFIGS[characterId]) {
            errors.push(
                `Boss ${bossId} 的characterId "${characterId}" 引用的怪物配置不存在`
            );
        } else {
            const monsterConfig = MONSTER_CONFIGS[characterId];
            // 检查Boss配置是否覆盖了基础属性（如果覆盖了，可能是正常的）
            if (
                bossConfig.baseHp !== undefined ||
                bossConfig.baseDamage !== undefined ||
                bossConfig.baseDefense !== undefined
            ) {
                // Boss配置覆盖了基础属性，这是正常的，只记录为信息
                console.log(
                    `Boss ${bossId} 覆盖了基础属性：baseHp=${bossConfig.baseHp}, baseDamage=${bossConfig.baseDamage}, baseDefense=${bossConfig.baseDefense}`
                );
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * 列出所有Boss配置信息（用于调试）
 */
export function listBossConfigs(): Array<{
    bossId: string;
    characterId: string;
    difficulty: string;
    monsterExists: boolean;
    monsterName?: string;
}> {
    const bossIds = Object.keys(BOSS_CONFIGS);
    return bossIds.map((bossId) => {
        const bossConfig = BOSS_CONFIGS[bossId];
        const characterId = bossConfig.characterId;
        const monsterConfig = MONSTER_CONFIGS[characterId];

        return {
            bossId,
            characterId,
            difficulty: bossConfig.difficulty,
            monsterExists: !!monsterConfig,
            monsterName: monsterConfig?.name,
        };
    });
}

