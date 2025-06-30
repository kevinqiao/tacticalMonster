// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 段位积分计算系统
export class SegmentScoringSystem {

    /**
     * 计算比赛积分变化
     */
    static calculatePointsChange(ctx: any, {
        playerSegment,
        opponentSegment,
        playerScore,
        opponentScore,
        isWin,
        playerStreak,
        matchType = "normal"
    }: {
        playerSegment: string;
        opponentSegment: string;
        playerScore: number;
        opponentScore: number;
        isWin: boolean;
        playerStreak: number;
        matchType?: string;
    }) {
        
        // 基础积分变化
        let basePointsChange = 0;
        
        if (isWin) {
            // 胜利积分计算
            basePointsChange = this.calculateWinPoints({
                playerSegment,
                opponentSegment,
                scoreDifference: playerScore - opponentScore,
                playerStreak
            });
        } else {
            // 失败积分计算
            basePointsChange = this.calculateLosePoints({
                playerSegment,
                opponentSegment,
                scoreDifference: opponentScore - playerScore,
                playerStreak,
                matchType
            });
        }

        // 段位差异调整
        const segmentMultiplier = this.getSegmentMultiplier(playerSegment, opponentSegment);
        
        // 连胜/连败奖励
        const streakBonus = this.calculateStreakBonus(playerStreak, isWin);
        
        // 最终积分变化
        const finalPointsChange = Math.round(basePointsChange * segmentMultiplier + streakBonus);
        
        return {
            pointsChange: finalPointsChange,
            basePoints: basePointsChange,
            segmentMultiplier,
            streakBonus,
            isWin,
            reason: this.getPointsChangeReason({
                isWin,
                playerSegment,
                opponentSegment,
                playerStreak,
                matchType
            })
        };
    }

    /**
     * 计算胜利积分
     */
    private static calculateWinPoints({
        playerSegment,
        opponentSegment,
        scoreDifference,
        playerStreak
    }: {
        playerSegment: string;
        opponentSegment: string;
        scoreDifference: number;
        playerStreak: number;
    }) {
        // 基础胜利积分
        let basePoints = 100;
        
        // 根据分数差异调整
        if (scoreDifference > 500) {
            basePoints += 50;  // 大胜奖励
        } else if (scoreDifference > 200) {
            basePoints += 20;  // 中胜奖励
        }
        
        // 连胜奖励
        if (playerStreak >= 10) {
            basePoints += 100;  // 10连胜奖励
        } else if (playerStreak >= 5) {
            basePoints += 50;   // 5连胜奖励
        } else if (playerStreak >= 3) {
            basePoints += 20;   // 3连胜奖励
        }
        
        return basePoints;
    }

    /**
     * 计算失败积分
     */
    private static calculateLosePoints({
        playerSegment,
        opponentSegment,
        scoreDifference,
        playerStreak,
        matchType
    }: {
        playerSegment: string;
        opponentSegment: string;
        scoreDifference: number;
        playerStreak: number;
        matchType: string;
    }) {
        
        // 新手保护：青铜段位失败不扣分
        if (playerSegment === "bronze") {
            return 0;
        }
        
        // 挑战高段位失败不扣分
        const playerTier = this.getSegmentTier(playerSegment);
        const opponentTier = this.getSegmentTier(opponentSegment);
        
        if (opponentTier > playerTier + 1) {
            return 0;  // 挑战高2个段位以上失败不扣分
        }
        
        // 连胜保护
        if (playerStreak >= 10) {
            return 0;  // 10连胜后失败不扣分
        } else if (playerStreak >= 5) {
            return -10;  // 5连胜后失败轻微扣分
        } else if (playerStreak >= 3) {
            return -20;  // 3连胜后失败轻微扣分
        }
        
        // 基础失败扣分
        let basePoints = -50;
        
        // 根据分数差异调整
        if (scoreDifference > 500) {
            basePoints -= 30;  // 大败多扣分
        } else if (scoreDifference > 200) {
            basePoints -= 15;  // 中败多扣分
        }
        
        // 挑战低段位失败扣更多分
        if (opponentTier < playerTier) {
            basePoints *= 1.5;
        }
        
        // 特殊比赛类型调整
        if (matchType === "tournament") {
            basePoints *= 0.8;  // 锦标赛失败扣分较少
        } else if (matchType === "ranked") {
            basePoints *= 1.2;  // 排位赛失败扣分较多
        }
        
        return Math.round(basePoints);
    }

    /**
     * 获取段位差异乘数
     */
    private static getSegmentMultiplier(playerSegment: string, opponentSegment: string): number {
        const playerTier = this.getSegmentTier(playerSegment);
        const opponentTier = this.getSegmentTier(opponentSegment);
        
        const tierDifference = opponentTier - playerTier;
        
        if (tierDifference >= 2) {
            return 1.5;  // 击败高2个段位以上
        } else if (tierDifference === 1) {
            return 1.2;  // 击败高1个段位
        } else if (tierDifference === 0) {
            return 1.0;  // 同段位
        } else if (tierDifference === -1) {
            return 0.8;  // 击败低1个段位
        } else {
            return 0.5;  // 击败低2个段位以上
        }
    }

    /**
     * 计算连胜/连败奖励
     */
    private static calculateStreakBonus(streak: number, isWin: boolean): number {
        if (isWin) {
            // 连胜奖励
            if (streak >= 10) return 100;
            if (streak >= 5) return 50;
            if (streak >= 3) return 20;
        } else {
            // 连败惩罚（轻微）
            if (streak <= -5) return -20;
            if (streak <= -3) return -10;
        }
        return 0;
    }

    /**
     * 获取段位等级
     */
    private static getSegmentTier(segment: string): number {
        const tierMap = {
            bronze: 1,
            silver: 2,
            gold: 3,
            platinum: 4,
            diamond: 5,
            master: 6
        };
        return tierMap[segment] || 1;
    }

    /**
     * 获取积分变化原因
     */
    private static getPointsChangeReason({
        isWin,
        playerSegment,
        opponentSegment,
        playerStreak,
        matchType
    }: {
        isWin: boolean;
        playerSegment: string;
        opponentSegment: string;
        playerStreak: number;
        matchType: string;
    }): string {
        if (isWin) {
            if (playerStreak >= 10) return "10连胜奖励";
            if (playerStreak >= 5) return "5连胜奖励";
            if (playerStreak >= 3) return "3连胜奖励";
            return "胜利";
        } else {
            if (playerSegment === "bronze") return "新手保护";
            if (playerStreak >= 10) return "连胜保护";
            if (playerStreak >= 5) return "连胜保护";
            if (playerStreak >= 3) return "连胜保护";
            return "失败";
        }
    }

    /**
     * 更新玩家连胜/连败状态
     */
    static updateStreak(currentStreak: number, isWin: boolean): {
        newStreak: number;
        streakType: "win" | "loss" | "none";
    } {
        if (isWin) {
            if (currentStreak >= 0) {
                return { newStreak: currentStreak + 1, streakType: "win" };
            } else {
                return { newStreak: 1, streakType: "win" };
            }
        } else {
            if (currentStreak <= 0) {
                return { newStreak: currentStreak - 1, streakType: "loss" };
            } else {
                return { newStreak: -1, streakType: "loss" };
            }
        }
    }

    /**
     * 检查是否需要降级保护
     */
    static checkDemotionProtection({
        currentSegment,
        currentPoints,
        newPoints,
        protectionMatchesRemaining
    }: {
        currentSegment: string;
        currentPoints: number;
        newPoints: number;
        protectionMatchesRemaining: number;
    }): {
        needsProtection: boolean;
        protectionUsed: boolean;
        finalPoints: number;
    } {
        // 获取段位最低积分要求
        const segmentMinPoints = this.getSegmentMinPoints(currentSegment);
        
        // 如果新积分低于段位要求且还有保护场次
        if (newPoints < segmentMinPoints && protectionMatchesRemaining > 0) {
            return {
                needsProtection: true,
                protectionUsed: true,
                finalPoints: currentPoints  // 保持原积分
            };
        }
        
        return {
            needsProtection: false,
            protectionUsed: false,
            finalPoints: newPoints
        };
    }

    /**
     * 获取段位最低积分要求
     */
    private static getSegmentMinPoints(segment: string): number {
        const minPointsMap = {
            bronze: 0,
            silver: 1000,
            gold: 2500,
            platinum: 5000,
            diamond: 10000,
            master: 20000
        };
        return minPointsMap[segment] || 0;
    }
}

// ===== Convex 函数接口 =====

// 计算比赛积分变化
export const calculateMatchPoints = (mutation as any)({
    args: {
        playerSegment: v.string(),
        opponentSegment: v.string(),
        playerScore: v.number(),
        opponentScore: v.number(),
        isWin: v.boolean(),
        playerStreak: v.number(),
        matchType: v.optional(v.string())
    },
    handler: async (ctx: any, args: any) => {
        return SegmentScoringSystem.calculatePointsChange(ctx, args);
    }
});

// 更新玩家连胜状态
export const updatePlayerStreak = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        isWin: v.boolean()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, isWin } = args;
        const now = getTorontoDate();

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        // 更新连胜状态
        const { newStreak, streakType } = SegmentScoringSystem.updateStreak(playerSegment.streak, isWin);

        // 更新玩家段位信息
        await ctx.db.patch(playerSegment._id, {
            streak: newStreak,
            streakType,
            updatedAt: now.iso
        });

        return {
            success: true,
            oldStreak: playerSegment.streak,
            newStreak,
            streakType,
            message: isWin ? "连胜更新成功" : "连败更新成功"
        };
    }
});

// 获取积分计算规则说明
export const getScoringRules = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        return {
            success: true,
            rules: {
                winPoints: {
                    base: 100,
                    scoreBonus: {
                        "大胜(>500分)": "+50",
                        "中胜(>200分)": "+20"
                    },
                    streakBonus: {
                        "10连胜": "+100",
                        "5连胜": "+50",
                        "3连胜": "+20"
                    }
                },
                losePoints: {
                    bronze: "0 (新手保护)",
                    silver: "-20 to -50",
                    gold: "-30 to -60",
                    platinum: "-40 to -70",
                    diamond: "-50 to -80",
                    master: "-60 to -90",
                    protection: {
                        "10连胜后": "0",
                        "5连胜后": "-10",
                        "3连胜后": "-20"
                    }
                },
                segmentMultiplier: {
                    "击败高2段以上": "1.5x",
                    "击败高1段": "1.2x",
                    "同段位": "1.0x",
                    "击败低1段": "0.8x",
                    "击败低2段以上": "0.5x"
                }
            }
        };
    }
}); 