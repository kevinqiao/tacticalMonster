import { getTorontoDate } from "../../utils";
import {
    baseHandler,
    JoinArgs,
    JoinResult,
    SubmitScoreArgs,
    SubmitScoreResult,
    TournamentHandler
} from "./base";

/**
 * 示例处理器 - 展示如何最大化继承base.ts
 * 
 * 继承策略：
 * 1. 使用扩展运算符继承所有基础方法
 * 2. 只重写需要自定义的方法
 * 3. 在重写的方法中调用基础方法
 * 4. 添加新的自定义方法
 */
export const exampleHandler: TournamentHandler = {
    // ==================== 完全继承基础方法 ====================
    ...baseHandler,

    // ==================== 重写核心方法 ====================

    /**
     * 重写加入方法 - 添加自定义逻辑
     */
    async join(ctx, args: JoinArgs): Promise<JoinResult> {
        console.log("示例处理器: 开始加入锦标赛", args.tournamentType);

        // 调用基础验证
        await this.validateJoin(ctx, args);

        // 添加自定义验证逻辑
        await this.validateCustomConditions(ctx, args);

        // 调用基础加入逻辑
        const baseResult = await baseHandler.join(ctx, args);

        // 添加自定义后处理
        await this.postJoinProcessing(ctx, { ...args, ...baseResult });

        console.log("示例处理器: 锦标赛加入完成");

        return {
            ...baseResult,
            success: true,
            customField: "示例处理器的自定义字段"
        };
    },

    /**
     * 重写分数提交方法 - 添加阈值逻辑
     */
    async submitScore(ctx, args: SubmitScoreArgs): Promise<SubmitScoreResult> {
        console.log("示例处理器: 开始提交分数");

        // 调用基础验证
        await this.validateScore(ctx, args);

        // 添加自定义验证
        await this.validateThresholdScore(ctx, args);

        // 调用基础提交逻辑
        const baseResult = await baseHandler.submitScore(ctx, args);

        // 添加自定义后处理
        await this.postScoreProcessing(ctx, { ...args, ...baseResult });

        console.log("示例处理器: 分数提交完成");

        return baseResult;
    },

    /**
     * 重写结算方法 - 添加阈值排名逻辑
     */
    async settle(ctx, tournamentId: string): Promise<void> {
        console.log("示例处理器: 开始结算锦标赛", tournamentId);

        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) {
            throw new Error("锦标赛不存在");
        }

        // 检查是否为阈值锦标赛
        if (tournament.config?.rules?.rankingMethod === "threshold") {
            await this.settleThresholdTournament(ctx, tournamentId);
        } else {
            // 使用基础结算逻辑
            await baseHandler.settle(ctx, tournamentId);
        }

        console.log("示例处理器: 锦标赛结算完成");
    },

    // ==================== 自定义方法 ====================

    /**
     * 自定义验证条件
     */
    async validateCustomConditions(ctx: any, args: JoinArgs): Promise<void> {
        const { uid, tournamentType } = args;

        // 检查玩家是否有特殊权限
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (player?.customFlags?.restricted) {
            throw new Error("您的账户暂时无法参与此锦标赛");
        }

        // 检查特殊时间限制
        const now = getTorontoDate();
        const hour = now.localDate.getHours();

        if (hour < 6 || hour > 22) {
            throw new Error("此锦标赛仅在6:00-22:00期间开放");
        }
    },

    /**
     * 验证阈值分数
     */
    async validateThresholdScore(ctx: any, args: SubmitScoreArgs): Promise<void> {
        const { tournamentId, score } = args;

        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) return;

        const threshold = tournament.config?.rules?.scoreThreshold;
        if (threshold && score < threshold) {
            console.log(`分数 ${score} 未达到阈值 ${threshold}`);
        }
    },

    /**
     * 阈值锦标赛结算
     */
    async settleThresholdTournament(ctx: any, tournamentId: string): Promise<void> {
        const tournament = await ctx.db.get(tournamentId);
        if (!tournament) return;

        const threshold = tournament.config?.rules?.scoreThreshold || 1000;

        // 获取所有比赛记录
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q: any) => q.eq("tournamentId", tournamentId))
            .filter((q: any) => q.eq(q.field("completed"), true))
            .collect();

        if (matches.length === 0) {
            throw new Error("没有完成的比赛记录");
        }

        // 阈值排名逻辑
        const playerScores = new Map<string, number>();
        for (const match of matches) {
            const currentScore = playerScores.get(match.uid) || 0;
            playerScores.set(match.uid, Math.max(currentScore, match.score));
        }

        // 根据阈值分配排名
        const sortedPlayers = Array.from(playerScores.entries())
            .map(([uid, score]) => ({
                uid,
                score,
                rank: score >= threshold ? 1 : 2 // 达到阈值获得第一名，否则第二名
            }))
            .sort((a, b) => {
                // 首先按排名排序，然后按分数排序
                if (a.rank !== b.rank) {
                    return a.rank - b.rank;
                }
                return b.score - a.score;
            });

        // 分配奖励
        for (const playerData of sortedPlayers) {
            try {
                await this.distributeRewards(ctx, {
                    uid: playerData.uid,
                    rank: playerData.rank,
                    score: playerData.score,
                    tournament,
                    matches: matches.filter((m: any) => m.uid === playerData.uid)
                });
            } catch (error: any) {
                console.error(`分配奖励失败 (${playerData.uid}):`, error);
            }
        }

        // 更新锦标赛状态
        const now = getTorontoDate();
        await ctx.db.patch(tournamentId, {
            status: "completed",
            updatedAt: now.iso
        });
    },

    /**
     * 加入后处理
     */
    async postJoinProcessing(ctx: any, data: any): Promise<void> {
        const { uid, tournamentId, tournamentType } = data;

        // 记录特殊日志
        await ctx.db.insert("custom_logs", {
            uid,
            tournamentId,
            tournamentType,
            action: "join",
            timestamp: getTorontoDate().iso,
            handler: "exampleHandler"
        });

        // 发送特殊通知
        await ctx.db.insert("notifications", {
            uid,
            message: `欢迎参加${tournamentType}！这是示例处理器的特殊欢迎消息。`,
            createdAt: getTorontoDate().iso
        });
    },

    /**
     * 分数提交后处理
     */
    async postScoreProcessing(ctx: any, data: any): Promise<void> {
        const { uid, tournamentId, score, settled } = data;

        if (settled) {
            // 锦标赛已结算，发送特殊通知
            await ctx.db.insert("notifications", {
                uid,
                message: `恭喜！您的分数${score}已提交，锦标赛已结算。`,
                createdAt: getTorontoDate().iso
            });
        }
    },

    /**
     * 自定义奖励分配
     */
    async distributeRewards(ctx: any, data: any): Promise<void> {
        const { uid, rank, score, tournament } = data;

        // 调用基础奖励分配
        await baseHandler.distributeRewards(ctx, data);

        // 添加自定义奖励
        if (rank === 1) {
            await ctx.db.insert("notifications", {
                uid,
                message: `🎉 恭喜获得第一名！这是示例处理器的特殊奖励通知。`,
                createdAt: getTorontoDate().iso
            });
        }
    }
};

/**
 * 工厂函数 - 创建自定义处理器
 */
export function createCustomHandler(customConfig: {
    enableThresholdRanking?: boolean;
    customValidation?: boolean;
    specialNotifications?: boolean;
}): TournamentHandler {
    const handler = { ...baseHandler };

    if (customConfig.enableThresholdRanking) {
        handler.settle = exampleHandler.settle;
    }

    if (customConfig.customValidation) {
        handler.validateJoin = exampleHandler.validateJoin;
    }

    if (customConfig.specialNotifications) {
        handler.distributeRewards = exampleHandler.distributeRewards;
    }

    return handler;
}

/**
 * 使用示例
 */
export function handlerUsageExample() {
    console.log("=== 处理器使用示例 ===");

    // 1. 使用完全继承的处理器
    const basicHandler = { ...baseHandler };

    // 2. 使用部分重写的处理器
    const customHandler = {
        ...baseHandler,
        join: exampleHandler.join,
        settle: exampleHandler.settle
    };

    // 3. 使用工厂函数创建处理器
    const factoryHandler = createCustomHandler({
        enableThresholdRanking: true,
        customValidation: true,
        specialNotifications: true
    });

    console.log("处理器创建完成");
    return { basicHandler, customHandler, factoryHandler };
} 