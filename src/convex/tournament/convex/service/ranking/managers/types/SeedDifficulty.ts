/**
 * 种子难度相关类型定义
 */

// 难度等级枚举
export type DifficultyLevel = 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard';

// 种子难度信息
export interface SeedDifficultyInfo {
    seed: string;
    difficultyLevel: DifficultyLevel;
    difficultyCoefficient: number;
    averageScore: number;
    totalMatches: number;
    lastUpdated: string;
}

// 难度配置
export interface DifficultyConfig {
    level: DifficultyLevel;
    coefficientRange: {
        min: number;
        max: number;
    };
    scoreRange: {
        min: number;
        max: number;
    };
    description: string;
}

// 获取种子参数
export interface GetSeedsByDifficultyOptions {
    difficultyLevel: DifficultyLevel;
    limit?: number;
    excludeSeeds?: string[];
    minMatches?: number; // 最少比赛场次
}
