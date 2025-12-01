/**
 * Boss配置服务
 * 提供Boss配置查询和验证功能
 */

import { BossConfig, getBossConfig, getBossIdsByDifficulty } from "../../data/bossConfigs";

export class BossConfigService {
    /**
     * 获取Boss配置（包含Boss本体和小怪）
     */
    static getBossConfig(bossId: string): BossConfig | null {
        const config = getBossConfig(bossId);
        return config || null;
    }

    /**
     * 根据难度获取Boss ID列表
     */
    static getBossIdsByDifficulty(difficulty: string): string[] {
        return getBossIdsByDifficulty(difficulty);
    }

    /**
     * 验证Boss配置是否完整
     */
    static validateBossConfig(bossId: string): { valid: boolean; errors: string[] } {
        const config = this.getBossConfig(bossId);
        const errors: string[] = [];

        if (!config) {
            return { valid: false, errors: [`Boss配置不存在: ${bossId}`] };
        }

        // 验证必填字段
        if (!config.bossId) errors.push("bossId缺失");
        if (!config.name) errors.push("name缺失");
        if (!config.difficulty) errors.push("difficulty缺失");
        if (config.baseHp <= 0) errors.push("baseHp必须大于0");
        if (config.baseDamage < 0) errors.push("baseDamage不能为负");
        if (config.baseDefense < 0) errors.push("baseDefense不能为负");
        if (!config.assetPath) errors.push("assetPath缺失");

        // 验证小怪配置（如果存在）
        if (config.minions) {
            config.minions.forEach((minion, index) => {
                if (!minion.minionId) errors.push(`minion[${index}].minionId缺失`);
                if (!minion.name) errors.push(`minion[${index}].name缺失`);
                if (minion.quantity <= 0) errors.push(`minion[${index}].quantity必须大于0`);
                if (minion.baseHp <= 0) errors.push(`minion[${index}].baseHp必须大于0`);
                if (!minion.assetPath) errors.push(`minion[${index}].assetPath缺失`);
            });
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * 获取Boss组合中所有角色的配置
     */
    static getAllCharacterConfigs(bossId: string): Array<{
        characterId: string;
        type: "bossMain" | "minion";
        config: any;
    }> {
        const bossConfig = this.getBossConfig(bossId);
        if (!bossConfig) {
            return [];
        }

        const configs: Array<{
            characterId: string;
            type: "bossMain" | "minion";
            config: any;
        }> = [];

        // Boss本体配置
        configs.push({
            characterId: `${bossId}_main`,
            type: "bossMain",
            config: {
                name: bossConfig.name,
                baseHp: bossConfig.baseHp,
                baseDamage: bossConfig.baseDamage,
                baseDefense: bossConfig.baseDefense,
                baseSpeed: bossConfig.baseSpeed || 10,
                skills: bossConfig.skills || [],
                assetPath: bossConfig.assetPath,
            },
        });

        // 小怪配置
        if (bossConfig.minions) {
            bossConfig.minions.forEach((minion) => {
                for (let i = 0; i < minion.quantity; i++) {
                    configs.push({
                        characterId: `${minion.minionId}_${i}`,
                        type: "minion",
                        config: {
                            name: minion.name,
                            baseHp: minion.baseHp,
                            baseDamage: minion.baseDamage,
                            baseDefense: minion.baseDefense,
                            baseSpeed: minion.baseSpeed,
                            skills: minion.skills || [],
                            assetPath: minion.assetPath,
                        },
                    });
                }
            });
        }

        return configs;
    }
}
