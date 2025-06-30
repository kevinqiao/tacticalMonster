// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 软性段位系统 - 失败不扣SP
export class SoftSegmentSystem {

    /**
     * 计算比赛SP变化（失败不扣SP）
     */
    static calculateSPChange({
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

        if (isWin) {
            // 胜利SP计算
            return this.calculateWinSP({
                playerSegment,
                opponentSegment,
                scoreDifference: playerScore - opponentScore,
                playerStreak,
                matchType
            });
        } else {
            // 失败不扣SP，只记录比赛
            return {
                spChange: 0,
                baseSP: 0,
                segmentMultiplier: 1.0,
                streakBonus: 0,
                isWin: false,
                reason: "失败不扣SP",
                matchRecorded: true
            };
        }
    }

    /**
     * 计算胜利SP
     */
    private static calculateWinSP({
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
        // 基础胜利SP
        let baseSP = 100;

        // 根据分数差异调整
        if (scoreDifference > 500) {
            baseSP += 50;  // 大胜奖励
        } else if (scoreDifference > 200) {
            baseSP += 20;  // 中胜奖励
        }

        // 连胜奖励
        if (playerStreak >= 10) {
            baseSP += 100;  // 10连胜奖励
        } else if (playerStreak >= 5) {
            baseSP += 50;   // 5连胜奖励
        } else if (playerStreak >= 3) {
            baseSP += 20;   // 3连胜奖励
        }

        // 段位差异调整
        const segmentMultiplier = this.getSegmentMultiplier(playerSegment, opponentSegment);

        // 比赛类型调整
        const typeMultiplier = this.getMatchTypeMultiplier(matchType);

        // 最终SP变化
        const finalSPChange = Math.round(baseSP * segmentMultiplier * typeMultiplier);

        return {
            spChange: finalSPChange,
            baseSP: baseSP,
            segmentMultiplier,
            typeMultiplier,
            streakBonus: 0, // 连胜奖励已包含在baseSP中
            isWin: true,
            reason: this.getWinReason(playerStreak, scoreDifference),
            matchRecorded: true
        };
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
     * 获取比赛类型乘数
     */
    private static getMatchTypeMultiplier(matchType: string): number {
        const multipliers = {
            tournament: 1.5,    // 锦标赛奖励更高
            master_challenge: 2.0, // 大师挑战赛最高奖励
            ranked: 1.2,        // 排位赛
            casual: 0.8,        // 休闲赛
            normal: 1.0         // 普通比赛
        };
        return multipliers[matchType] || 1.0;
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
     * 获取胜利原因
     */
    private static getWinReason(playerStreak: number, scoreDifference: number): string {
        if (playerStreak >= 10) return "10连胜奖励";
        if (playerStreak >= 5) return "5连胜奖励";
        if (playerStreak >= 3) return "3连胜奖励";
        if (scoreDifference > 500) return "大胜奖励";
        if (scoreDifference > 200) return "中胜奖励";
        return "胜利";
    }

    /**
     * 检查不活跃惩罚
     */
    static checkInactivityPenalty({
        lastActivityDate,
        currentSegment,
        currentSP,
        currentDate
    }: {
        lastActivityDate: string;
        currentSegment: string;
        currentSP: number;
        currentDate: string;
    }) {
        const lastActivity = new Date(lastActivityDate);
        const now = new Date(currentDate);
        const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        // 只有白银及以上段位才有不活跃惩罚
        if (this.getSegmentTier(currentSegment) < 2) {
            return {
                hasPenalty: false,
                penaltyAmount: 0,
                reason: "青铜段位无活跃度要求"
            };
        }

        // 7天未参与开始惩罚
        if (daysInactive >= 7) {
            const weeksInactive = Math.floor(daysInactive / 7);
            const penaltyPercentage = Math.min(0.15, 0.07 + (weeksInactive - 1) * 0.02); // 7-15%
            const maxPenalty = this.getMaxInactivityPenalty(currentSegment);
            const penaltyAmount = Math.min(
                Math.round(currentSP * penaltyPercentage),
                maxPenalty
            );

            return {
                hasPenalty: true,
                penaltyAmount: penaltyAmount,
                weeksInactive: weeksInactive,
                penaltyPercentage: penaltyPercentage,
                reason: `${weeksInactive}周未参与，扣除${penaltyPercentage * 100}% SP`,
                newSP: Math.max(0, currentSP - penaltyAmount)
            };
        }

        return {
            hasPenalty: false,
            penaltyAmount: 0,
            reason: "活跃度正常"
        };
    }

    /**
     * 获取最大不活跃惩罚
     */
    private static getMaxInactivityPenalty(segment: string): number {
        const penaltyMap = {
            silver: 100,
            gold: 150,
            platinum: 180,
            diamond: 200,
            master: 200
        };
        return penaltyMap[segment] || 100;
    }

    /**
     * 计算回归奖励
     */
    static calculateReturnReward({
        daysInactive,
        currentSegment
    }: {
        daysInactive: number;
        currentSegment: string;
    }) {
        // 7天以上未参与才有回归奖励
        if (daysInactive < 7) {
            return {
                hasReward: false,
                spReward: 0,
                ticketReward: 0,
                propReward: 0,
                reason: "活跃度正常，无回归奖励"
            };
        }

        const baseReward = {
            spReward: 50,
            ticketReward: 1, // 普通门票
            propReward: 1    // 基础道具
        };

        // 根据不活跃时间调整奖励
        const weeksInactive = Math.floor(daysInactive / 7);
        const multiplier = Math.min(2.0, 1.0 + weeksInactive * 0.2); // 最多2倍奖励

        return {
            hasReward: true,
            spReward: Math.round(baseReward.spReward * multiplier),
            ticketReward: Math.round(baseReward.ticketReward * multiplier),
            propReward: Math.round(baseReward.propReward * multiplier),
            weeksInactive: weeksInactive,
            multiplier: multiplier,
            reason: `回归奖励：${weeksInactive}周未参与`
        };
    }

    /**
     * 检查大师维护要求
     */
    static checkMasterMaintenance({
        currentSegment,
        currentSP,
        weeklyTournamentCount,
        currentDate
    }: {
        currentSegment: string;
        currentSP: number;
        weeklyTournamentCount: number;
        currentDate: string;
    }) {
        if (currentSegment !== "master") {
            return {
                isMaster: false,
                maintenanceRequired: false,
                reason: "非大师段位"
            };
        }

        const maintenanceRequirements = {
            weeklyTournaments: 3,
            minSP: 2000
        };

        const isMaintaining = weeklyTournamentCount >= maintenanceRequirements.weeklyTournaments;
        const hasEnoughSP = currentSP >= maintenanceRequirements.minSP;

        if (!isMaintaining || !hasEnoughSP) {
            return {
                isMaster: true,
                maintenanceRequired: true,
                demotionRequired: !hasEnoughSP,
                newSegment: !hasEnoughSP ? "diamond" : "master",
                newSP: !hasEnoughSP ? Math.max(1800, currentSP - 200) : currentSP,
                reason: !hasEnoughSP ?
                    `SP不足${maintenanceRequirements.minSP}，降至钻石III` :
                    `周锦标赛不足${maintenanceRequirements.weeklyTournaments}场`,
                maintenanceReward: isMaintaining ? {
                    spReward: 100,
                    ticketReward: 1, // 高级门票
                    propReward: 1    // 进阶道具
                } : null
            };
        }

        return {
            isMaster: true,
            maintenanceRequired: false,
            maintenanceReward: {
                spReward: 100,
                ticketReward: 1, // 高级门票
                propReward: 1    // 进阶道具
            },
            reason: "大师维护完成"
        };
    }

    /**
     * 更新玩家活跃度
     */
    static updatePlayerActivity({
        uid,
        gameType,
        currentDate
    }: {
        uid: string;
        gameType: string;
        currentDate: string;
    }) {
        return {
            lastActivityDate: currentDate,
            isActive: true,
            message: "活跃度更新成功"
        };
    }

    /**
     * 计算段位晋升
     */
    static calculatePromotion({
        currentSegment,
        currentSP,
        currentDate
    }: {
        currentSegment: string;
        currentSP: number;
        currentDate: string;
    }) {
        const segmentRequirements = {
            bronze: { minSP: 0, maxSP: 999 },
            silver: { minSP: 1000, maxSP: 2499 },
            gold: { minSP: 2500, maxSP: 4999 },
            platinum: { minSP: 5000, maxSP: 9999 },
            diamond: { minSP: 10000, maxSP: 19999 },
            master: { minSP: 20000, maxSP: 999999 }
        };

        const currentRequirement = segmentRequirements[currentSegment];
        if (!currentRequirement) {
            return {
                canPromote: false,
                newSegment: currentSegment,
                reason: "无效段位"
            };
        }

        // 检查是否可以晋升
        for (const [segment, requirement] of Object.entries(segmentRequirements)) {
            if (currentSP >= requirement.minSP && currentSP <= requirement.maxSP) {
                if (segment !== currentSegment) {
                    return {
                        canPromote: true,
                        oldSegment: currentSegment,
                        newSegment: segment,
                        reason: `SP达到${segment}段位要求`
                    };
                }
                break;
            }
        }

        return {
            canPromote: false,
            currentSegment: currentSegment,
            reason: "SP未达到晋升要求"
        };
    }
}

// ===== Convex 函数接口 =====

// 计算比赛SP变化
export const calculateMatchSP = (mutation as any)({
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
        return SoftSegmentSystem.calculateSPChange(args);
    }
});

// 检查不活跃惩罚
export const checkInactivityPenalty = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;
        const now = getTorontoDate();

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        // 检查不活跃惩罚
        const penaltyResult = SoftSegmentSystem.checkInactivityPenalty({
            lastActivityDate: playerSegment.lastActivityDate || now.iso,
            currentSegment: playerSegment.segment,
            currentSP: playerSegment.points,
            currentDate: now.iso
        });

        // 如果有惩罚，更新玩家SP
        if (penaltyResult.hasPenalty) {
            await ctx.db.patch(playerSegment._id, {
                points: penaltyResult.newSP,
                updatedAt: now.iso
            });
        }

        return {
            success: true,
            penalty: penaltyResult,
            playerSegment: {
                uid: playerSegment.uid,
                segment: playerSegment.segment,
                points: penaltyResult.hasPenalty ? penaltyResult.newSP : playerSegment.points
            }
        };
    }
});

// 计算回归奖励
export const calculateReturnReward = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;
        const now = getTorontoDate();

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        const lastActivity = new Date(playerSegment.lastActivityDate || now.iso);
        const daysInactive = Math.floor((now.date.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        // 计算回归奖励
        const rewardResult = SoftSegmentSystem.calculateReturnReward({
            daysInactive,
            currentSegment: playerSegment.segment
        });

        // 如果有奖励，更新玩家SP
        if (rewardResult.hasReward) {
            const newSP = playerSegment.points + rewardResult.spReward;
            await ctx.db.patch(playerSegment._id, {
                points: newSP,
                lastActivityDate: now.iso,
                updatedAt: now.iso
            });

            // TODO: 添加门票和道具奖励逻辑
            // await addTicketsToPlayer(uid, rewardResult.ticketReward);
            // await addPropsToPlayer(uid, rewardResult.propReward);
        }

        return {
            success: true,
            reward: rewardResult,
            playerSegment: {
                uid: playerSegment.uid,
                segment: playerSegment.segment,
                points: rewardResult.hasReward ? playerSegment.points + rewardResult.spReward : playerSegment.points
            }
        };
    }
});

// 检查大师维护
export const checkMasterMaintenance = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;
        const now = getTorontoDate();

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        // 获取本周锦标赛参与次数
        const weekStart = new Date(now.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const weeklyTournaments = await ctx.db
            .query("match_records")
            .withIndex("by_uid_game_date", (q: any) =>
                q.eq("uid", uid)
                    .eq("gameType", gameType)
                    .gte("createdAt", weekStart.toISOString())
                    .lte("createdAt", now.iso)
            )
            .filter((q: any) => q.eq(q.field("matchType"), "tournament"))
            .collect();

        const weeklyTournamentCount = weeklyTournaments.length;

        // 检查大师维护
        const maintenanceResult = SoftSegmentSystem.checkMasterMaintenance({
            currentSegment: playerSegment.segment,
            currentSP: playerSegment.points,
            weeklyTournamentCount,
            currentDate: now.iso
        });

        // 如果需要降级
        if (maintenanceResult.demotionRequired) {
            await ctx.db.patch(playerSegment._id, {
                segment: maintenanceResult.newSegment,
                points: maintenanceResult.newSP,
                updatedAt: now.iso
            });
        }

        // 如果有维护奖励
        if (maintenanceResult.maintenanceReward) {
            const newSP = playerSegment.points + maintenanceResult.maintenanceReward.spReward;
            await ctx.db.patch(playerSegment._id, {
                points: newSP,
                updatedAt: now.iso
            });

            // TODO: 添加门票和道具奖励逻辑
            // await addTicketsToPlayer(uid, maintenanceResult.maintenanceReward.ticketReward);
            // await addPropsToPlayer(uid, maintenanceResult.maintenanceReward.propReward);
        }

        return {
            success: true,
            maintenance: maintenanceResult,
            playerSegment: {
                uid: playerSegment.uid,
                segment: maintenanceResult.demotionRequired ? maintenanceResult.newSegment : playerSegment.segment,
                points: maintenanceResult.demotionRequired ? maintenanceResult.newSP :
                    (maintenanceResult.maintenanceReward ? playerSegment.points + maintenanceResult.maintenanceReward.spReward : playerSegment.points)
            }
        };
    }
});

// 更新玩家活跃度
export const updatePlayerActivity = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType } = args;
        const now = getTorontoDate();

        // 获取玩家段位信息
        const playerSegment = await ctx.db
            .query("player_segments")
            .withIndex("by_uid_game", (q: any) => q.eq("uid", uid).eq("gameType", gameType))
            .first();

        if (!playerSegment) {
            throw new Error("玩家段位信息不存在");
        }

        // 更新活跃度
        await ctx.db.patch(playerSegment._id, {
            lastActivityDate: now.iso,
            updatedAt: now.iso
        });

        return {
            success: true,
            message: "活跃度更新成功",
            lastActivityDate: now.iso
        };
    }
});

// 获取软性段位系统规则
export const getSoftSegmentRules = (query as any)({
    args: {},
    handler: async (ctx: any) => {
        return {
            success: true,
            rules: {
                spSystem: {
                    win: "100-300 SP (根据表现调整)",
                    lose: "0 SP (失败不扣分)",
                    description: "软性段位系统，失败不扣SP"
                },
                inactivityPenalty: {
                    target: "白银及以上段位",
                    condition: "7天未参与",
                    penalty: "每周减少7-15% SP (上限100-200 SP)",
                    noDemotion: "不降级"
                },
                returnReward: {
                    condition: "7天以上未参与后回归",
                    reward: "50 SP + 1张普通门票 + 1个基础道具",
                    scaling: "根据不活跃时间增加奖励"
                },
                masterMaintenance: {
                    requirement: "每周3场锦标赛",
                    minSP: "2000 SP",
                    penalty: "SP<2000降至钻石III",
                    reward: "100 SP + 1张高级门票 + 1个进阶道具"
                }
            }
        };
    }
}); 