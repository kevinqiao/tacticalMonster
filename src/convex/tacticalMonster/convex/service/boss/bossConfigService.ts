/**
 * Boss配置服务
 * 提供Boss配置查询和验证功能
 * 支持从 characterId 继承基础属性并合并
 */

import { BossConfig, getBossConfig, getBossIdsByDifficulty } from "../../data/bossConfigs";
import { MONSTER_CONFIGS } from "../../data/monsterConfigs";

/**
 * 合并后的Boss配置（包含继承的基础属性）
 */
export interface MergedBossConfig {
    bossId: string;
    characterId: string;
    difficulty: "easy" | "medium" | "hard" | "expert";

    // 从角色配置继承或覆盖的属性
    name: string;
    baseHp: number;
    baseDamage: number;
    baseDefense: number;
    baseSpeed: number;
    skills: any[];
    assetPath: string;

    // Boss 特有属性
    behaviorTree: any;
    minions?: Array<{
        minionId: string;
        characterId: string;
        quantity: number;
        name?: string;
        baseHp?: number;
        baseDamage?: number;
        baseDefense?: number;
        baseSpeed?: number;
        skills?: any[];
        assetPath?: string;
    }>;
    phases?: Array<{
        phaseName: string;
        hpThreshold: number;
        behaviorPattern: any;
        skillPriorities: any[];
        minionBehavior?: any;
    }>;

    configVersion: number;
}

export class BossConfigService {
    /**
     * 获取Boss配置（原始配置，未合并）
     */
    static getBossConfig(bossId: string): BossConfig | null {
        const config = getBossConfig(bossId);
        return config || null;
    }

    /**
     * 获取合并后的Boss配置（从characterId继承基础属性）
     * 这是推荐使用的方法，它会自动合并角色配置和Boss特有配置
     */
    static getMergedBossConfig(bossId: string): MergedBossConfig | null {
        const bossConfig = this.getBossConfig(bossId);
        if (!bossConfig) {
            return null;
        }

        // 1. 从角色配置获取基础属性
        const characterConfig = MONSTER_CONFIGS[bossConfig.characterId];
        if (!characterConfig) {
            throw new Error(`角色配置不存在: ${bossConfig.characterId} (Boss: ${bossId})`);
        }

        // 2. 合并配置（BossConfig 的覆盖属性优先）
        const merged: MergedBossConfig = {
            bossId: bossConfig.bossId,
            characterId: bossConfig.characterId,
            difficulty: bossConfig.difficulty,

            // 基础属性：优先使用 BossConfig 中的覆盖值，否则使用角色配置的值
            name: bossConfig.name || characterConfig.name,
            baseHp: bossConfig.baseHp ?? characterConfig.baseHp,
            baseDamage: bossConfig.baseDamage ?? characterConfig.baseDamage,
            baseDefense: bossConfig.baseDefense ?? characterConfig.baseDefense,
            baseSpeed: bossConfig.baseSpeed ?? characterConfig.baseSpeed,
            skills: bossConfig.skills || characterConfig.skills || [],
            assetPath: bossConfig.assetPath || characterConfig.assetPath,

            // Boss 特有属性
            behaviorTree: bossConfig.behaviorTree,
            minions: bossConfig.minions,
            phases: bossConfig.phases,
            configVersion: bossConfig.configVersion,
        };

        return merged;
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
        if (!config.characterId) errors.push("characterId缺失（必须引用一个角色配置）");
        if (!config.difficulty) errors.push("difficulty缺失");

        // 验证引用的角色配置是否存在
        const characterConfig = MONSTER_CONFIGS[config.characterId];
        if (!characterConfig) {
            errors.push(`引用的角色配置不存在: ${config.characterId}`);
        }

        // 验证可选覆盖属性（如果提供）
        if (config.baseHp !== undefined && config.baseHp <= 0) {
            errors.push("baseHp必须大于0（如果提供）");
        }
        if (config.baseDamage !== undefined && config.baseDamage < 0) {
            errors.push("baseDamage不能为负（如果提供）");
        }
        if (config.baseDefense !== undefined && config.baseDefense < 0) {
            errors.push("baseDefense不能为负（如果提供）");
        }

        // 验证小怪配置（如果存在）
        if (config.minions) {
            config.minions.forEach((minion, index) => {
                if (!minion.minionId) errors.push(`minion[${index}].minionId缺失`);
                if (!minion.characterId) errors.push(`minion[${index}].characterId缺失`);
                if (minion.quantity <= 0) errors.push(`minion[${index}].quantity必须大于0`);
            });
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * 获取Boss组合中所有角色的完整配置（合并后）
     */
    static getAllCharacterConfigs(bossId: string): Array<{
        characterId: string;
        type: "bossMain" | "minion";
        config: any;
    }> {
        const mergedBossConfig = this.getMergedBossConfig(bossId);
        if (!mergedBossConfig) {
            return [];
        }

        const configs: Array<{
            characterId: string;
            type: "bossMain" | "minion";
            config: any;
        }> = [];

        // Boss本体配置
        configs.push({
            characterId: mergedBossConfig.characterId,  // 使用引用的角色ID
            type: "bossMain",
            config: {
                name: mergedBossConfig.name,
                baseHp: mergedBossConfig.baseHp,
                baseDamage: mergedBossConfig.baseDamage,
                baseDefense: mergedBossConfig.baseDefense,
                baseSpeed: mergedBossConfig.baseSpeed,
                skills: mergedBossConfig.skills,
                assetPath: mergedBossConfig.assetPath,
            },
        });

        // 小怪配置
        if (mergedBossConfig.minions) {
            mergedBossConfig.minions.forEach((minion) => {
                // 获取小怪的角色配置
                const minionCharacterConfig = MONSTER_CONFIGS[minion.characterId];
                if (!minionCharacterConfig) {
                    console.warn(`小怪角色配置不存在: ${minion.characterId}`);
                    return;
                }

                for (let i = 0; i < minion.quantity; i++) {
                    configs.push({
                        characterId: minion.characterId,  // 使用引用的角色ID
                        type: "minion",
                        config: {
                            name: minion.name || minionCharacterConfig.name,
                            baseHp: minion.baseHp ?? minionCharacterConfig.baseHp,
                            baseDamage: minion.baseDamage ?? minionCharacterConfig.baseDamage,
                            baseDefense: minion.baseDefense ?? minionCharacterConfig.baseDefense,
                            baseSpeed: minion.baseSpeed ?? minionCharacterConfig.baseSpeed,
                            skills: minion.skills || minionCharacterConfig.skills || [],
                            assetPath: minion.assetPath || minionCharacterConfig.assetPath,
                        },
                    });
                }
            });
        }

        return configs;
    }
}
