/**
 * 玩家经验计算工具
 * 导出所有经验计算函数，方便使用
 * 
 * 使用方式：
 * import { calculateTaskExp, calculateTournamentExp } from "./playerExpCalculation";
 */

// 导出所有经验值计算函数
export * from "../calculation/exp/taskExpCalculation";
export * from "../calculation/exp/tournamentExpCalculation";
export * from "../calculation/exp/activityExpCalculation";

// 导出上限服务
export * from "../calculation/limits/dailyLimitService";

// 导出配置（可选，如果需要自定义配置）
export * from "../calculation/config/expRewardConfig";
export * from "../calculation/config/dailyLimitConfig";

// 辅助函数
/**
 * 格式化经验值显示
 * @param exp 经验值
 * @returns 格式化后的字符串，如 "100 EXP"
 */
export function formatExp(exp: number): string {
    return `${exp} EXP`;
}

/**
 * 计算经验值百分比（用于进度条显示）
 * @param currentExp 当前经验值
 * @param requiredExp 所需经验值
 * @returns 百分比（0-100）
 */
export function calculateExpPercentage(currentExp: number, requiredExp: number): number {
    if (requiredExp <= 0) return 100;
    return Math.min(100, Math.max(0, Math.floor((currentExp / requiredExp) * 100)));
}

