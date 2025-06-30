import { TournamentRules } from "./ruleEngine";

// 配置辅助工具
export class TournamentConfigHelper {
    private rules: TournamentRules;

    constructor(rules: TournamentRules) {
        this.rules = rules;
    }

    // 检查是否允许多次提交
    allowsMultipleSubmissions(): boolean {
        if (!this.rules.allowReuse) return false;
        return this.rules.maxSubmissionsPerTournament !== 1;
    }

    // 检查是否无限制提交
    allowsUnlimitedSubmissions(): boolean {
        return this.rules.maxSubmissionsPerTournament === -1;
    }

    // 获取最大提交次数
    getMaxSubmissionsPerTournament(): number {
        return this.rules.maxSubmissionsPerTournament || 1;
    }

    // 检查是否允许复用锦标赛
    allowsReuse(): boolean {
        return this.rules.allowReuse === true;
    }

    // 检查是否独立尝试模式
    isIndependentAttempts(): boolean {
        return this.rules.independentAttempts === true;
    }

    // 验证提交次数限制
    validateSubmissionCount(currentCount: number): { allowed: boolean; message?: string } {
        const maxSubmissions = this.getMaxSubmissionsPerTournament();

        if (maxSubmissions === -1) {
            return { allowed: true }; // 无限制
        }

        if (currentCount >= maxSubmissions) {
            return {
                allowed: false,
                message: maxSubmissions === 1
                    ? "您已参与该锦标赛，不能重复提交分数"
                    : `在该锦标赛中最多只能提交${maxSubmissions}次分数`
            };
        }

        return { allowed: true };
    }

    // 获取配置摘要
    getConfigSummary(): {
        mode: string;
        submissions: string;
        dailyLimit: number;
        maxTournamentsPerDay?: number;
    } {
        let mode = "独立尝试";
        let submissions = "1次";

        if (this.rules.allowReuse) {
            mode = "复用锦标赛";
            if (this.rules.maxSubmissionsPerTournament === -1) {
                submissions = "无限制";
            } else if (this.rules.maxSubmissionsPerTournament === 1) {
                submissions = "1次";
            } else {
                submissions = `${this.rules.maxSubmissionsPerTournament}次`;
            }
        }

        return {
            mode,
            submissions,
            dailyLimit: this.rules.dailyLimit || 0,
            maxTournamentsPerDay: this.rules.maxTournamentsPerDay,
        };
    }

    // 验证配置的完整性
    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 检查模式冲突
        if (this.rules.allowReuse && this.rules.independentAttempts) {
            errors.push("allowReuse 和 independentAttempts 不能同时为 true");
        }

        // 检查独立尝试模式的玩家数设置
        if (this.rules.independentAttempts) {
            if (this.rules.minPlayers !== 1 || this.rules.maxPlayers !== 1) {
                errors.push("独立尝试模式 (independentAttempts) 的 minPlayers 和 maxPlayers 必须都为 1");
            }
        }

        // 检查提交次数设置
        if (this.rules.allowReuse) {
            if (this.rules.maxSubmissionsPerTournament === 0) {
                errors.push("maxSubmissionsPerTournament 不能为 0");
            }
        }

        // 检查每日限制
        if (this.rules.dailyLimit && this.rules.dailyLimit < 0) {
            errors.push("dailyLimit 不能为负数");
        }

        if (this.rules.maxTournamentsPerDay && this.rules.maxTournamentsPerDay < 0) {
            errors.push("maxTournamentsPerDay 不能为负数");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// 预设配置的辅助函数
export const configHelpers = {
    // 普通锦标赛配置
    normal: () => new TournamentConfigHelper({
        allowReuse: true,
        maxSubmissionsPerTournament: 1,
        dailyLimit: 5,
        maxTournamentsPerDay: 3,
        createInitialMatch: true,
        minPlayers: 2,
        maxPlayers: 50,
        timeLimit: 60,
        autoClose: true,
        autoCloseDelay: 30
    }),

    // 练习锦标赛配置
    practice: () => new TournamentConfigHelper({
        allowReuse: true,
        maxSubmissionsPerTournament: 3,
        dailyLimit: 10,
        maxTournamentsPerDay: 5,
        createInitialMatch: false,
        minPlayers: 1,
        maxPlayers: 100,
        timeLimit: 120,
        autoClose: false
    }),

    // 精英锦标赛配置
    elite: () => new TournamentConfigHelper({
        independentAttempts: true,
        maxAttempts: 3,
        dailyLimit: 2,
        createInitialMatch: true,
        minPlayers: 1,
        maxPlayers: 1,
        timeLimit: 90,
        autoClose: true,
        autoCloseDelay: 15
    }),

    // 每日挑战配置
    dailyChallenge: () => new TournamentConfigHelper({
        allowReuse: true,
        maxSubmissionsPerTournament: 1,
        dailyLimit: 1,
        maxTournamentsPerDay: 1,
        createInitialMatch: true,
        minPlayers: 2,
        maxPlayers: 30,
        timeLimit: 45,
        autoClose: true,
        autoCloseDelay: 20
    }),

    // 无限练习配置
    unlimitedPractice: () => new TournamentConfigHelper({
        allowReuse: true,
        maxSubmissionsPerTournament: -1,
        dailyLimit: 20,
        maxTournamentsPerDay: 10,
        createInitialMatch: false,
        minPlayers: 1,
        maxPlayers: 200,
        timeLimit: 180,
        autoClose: false
    })
};

// 使用示例
export function createConfigHelper(config: any): TournamentConfigHelper {
    return new TournamentConfigHelper(config.rules || config);
} 