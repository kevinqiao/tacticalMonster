/**
 * 活动系统核心服务
 * 处理活动进度跟踪、奖励发放等核心功能
 */

import { Id } from "../../_generated/dataModel";
import { RewardService } from "../reward/rewardService";
import { UnifiedRewards } from "../reward/rewardTypes";

export interface ActivityTemplate {
    activityId: string;
    name: string;
    description: string;
    type: "login" | "limited_time" | "progress" | "recharge";
    category: "daily" | "weekly" | "event" | "seasonal";
    startDate: string;
    endDate: string;
    isActive: boolean;
    priority: number;
    icon?: string;
    banner?: string;
    seasonId?: string; // 赛季ID（仅seasonal类型使用，关联Battle Pass赛季）
    rules: any; // 活动规则，可包含shopDiscount等商店相关配置
    rewards?: any[];
    requirements?: any;
    resetInterval: "daily" | "weekly" | "monthly" | "none";
    maxCompletions: number;
    shopIds?: string[]; // 关联的商店ID列表（可选）
    shopDiscount?: number; // 商店折扣率（0-100，可选，也可在rules.shopDiscount中配置）
}

export interface PlayerActivityProgress {
    _id: Id<"player_activity_progress">;
    uid: string;
    activityId: string;
    progress: any;
    completedMilestones: string[];
    claimedRewards: string[];
    lastUpdate: string;
    startDate: string;
    endDate?: string;
    status: "active" | "completed" | "expired" | "claimed";
}

export class ActivityService {
    /**
     * 获取玩家可参与的活动
     */
    static async getActiveActivities(ctx: any, uid: string): Promise<Array<{
        template: ActivityTemplate;
        progress?: PlayerActivityProgress;
        availableRewards: string[];
    }>> {
        const nowISO = new Date().toISOString();

        // 查询激活的活动模板
        const activeTemplates = await ctx.db
            .query("activity_templates")
            .withIndex("by_active", (q: any) => q.eq("isActive", true))
            .filter((q: any) =>
                q.and(
                    q.lte(q.field("startDate"), nowISO),
                    q.gte(q.field("endDate"), nowISO)
                )
            )
            .collect();

        // 按优先级排序
        activeTemplates.sort((a: any, b: any) => b.priority - a.priority);

        const results: Array<{
            template: ActivityTemplate;
            progress?: PlayerActivityProgress;
            availableRewards: string[];
        }> = [];

        for (const template of activeTemplates) {
            // 检查参与条件
            if (template.requirements) {
                const canParticipate = await this.checkRequirements(ctx, uid, template.requirements);
                if (!canParticipate) continue;
            }

            // 获取或创建玩家进度（首次查看即参与）
            let progress = await this.getPlayerActivityProgress(ctx, uid, template.activityId);
            if (!progress) {
                // 自动创建进度记录（首次查看即参与）
                progress = await this.initializePlayerActivityProgress(ctx, uid, template.activityId, template as ActivityTemplate);
            }

            // 计算可领取奖励
            const availableRewards = this.calculateAvailableRewards(template, progress);

            results.push({
                template: template as ActivityTemplate,
                progress,
                availableRewards,
            });
        }

        return results;
    }

    /**
     * 获取当前赛季的活动（seasonal类型）
     */
    static async getCurrentSeasonActivities(ctx: any, uid: string, seasonId?: string): Promise<Array<{
        template: ActivityTemplate;
        progress?: PlayerActivityProgress;
        availableRewards: string[];
    }>> {
        // 如果没有提供seasonId，从Battle Pass获取当前赛季ID
        let currentSeasonId = seasonId;
        if (!currentSeasonId) {
            try {
                const { BattlePassSystem } = await import("../battlePass/battlePassSystem");
                const battlePassConfig = BattlePassSystem.getCurrentBattlePassConfig();
                currentSeasonId = battlePassConfig.seasonId;
            } catch (error) {
                console.error("获取当前赛季ID失败:", error);
                return [];
            }
        }

        const nowISO = new Date().toISOString();

        // 查询当前赛季的seasonal活动
        const allSeasonalActivities = await ctx.db
            .query("activity_templates")
            .withIndex("by_category", (q: any) => q.eq("category", "seasonal"))
            .filter((q: any) => q.eq(q.field("isActive"), true))
            .filter((q: any) =>
                q.and(
                    q.lte(q.field("startDate"), nowISO),
                    q.gte(q.field("endDate"), nowISO)
                )
            )
            .collect();

        // 过滤出当前赛季的活动
        const seasonalActivities = allSeasonalActivities.filter((activity: any) =>
            activity.seasonId === currentSeasonId
        );

        // 按优先级排序
        seasonalActivities.sort((a: any, b: any) => b.priority - a.priority);

        const results: Array<{
            template: ActivityTemplate;
            progress?: PlayerActivityProgress;
            availableRewards: string[];
        }> = [];

        for (const template of seasonalActivities) {
            // 检查参与条件
            if (template.requirements) {
                const canParticipate = await this.checkRequirements(ctx, uid, template.requirements);
                if (!canParticipate) continue;
            }

            // 获取或创建玩家进度
            let progress = await this.getPlayerActivityProgress(ctx, uid, template.activityId);
            if (!progress) {
                progress = await this.initializePlayerActivityProgress(ctx, uid, template.activityId, template as ActivityTemplate);
            }

            // 计算可领取奖励
            const availableRewards = this.calculateAvailableRewards(template, progress);

            results.push({
                template: template as ActivityTemplate,
                progress,
                availableRewards,
            });
        }

        return results;
    }

    /**
     * 获取玩家活动进度
     */
    static async getPlayerActivityProgress(
        ctx: any,
        uid: string,
        activityId: string
    ): Promise<PlayerActivityProgress | undefined> {
        const progress = await ctx.db
            .query("player_activity_progress")
            .withIndex("by_uid_activityId", (q: any) =>
                q.eq("uid", uid).eq("activityId", activityId)
            )
            .unique();

        if (!progress) {
            return undefined;
        }

        return progress as PlayerActivityProgress;
    }

    /**
     * 初始化玩家活动进度
     */
    static async initializePlayerActivityProgress(
        ctx: any,
        uid: string,
        activityId: string,
        template: ActivityTemplate
    ): Promise<PlayerActivityProgress> {
        const nowISO = new Date().toISOString();
        const initialProgress = this.getInitialProgress(template);

        const progressId = await ctx.db.insert("player_activity_progress", {
            uid,
            activityId,
            progress: initialProgress,
            completedMilestones: [],
            claimedRewards: [],
            lastUpdate: nowISO,
            startDate: nowISO,
            status: "active",
            createdAt: nowISO,
            updatedAt: nowISO,
        });

        const progress = await ctx.db.get(progressId);
        return progress as PlayerActivityProgress;
    }

    /**
     * 更新活动进度
     */
    static async updateActivityProgress(
        ctx: any,
        uid: string,
        activityId: string,
        progressData: any
    ): Promise<{
        success: boolean;
        message: string;
        newMilestones?: string[];
        rewardsGranted?: boolean;
    }> {
        try {
            // 获取活动模板
            const template = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .unique();

            if (!template || !template.isActive) {
                return {
                    success: false,
                    message: "活动不存在或未激活",
                };
            }

            // 获取或创建玩家进度
            let progress = await this.getPlayerActivityProgress(ctx, uid, activityId);
            if (!progress) {
                progress = await this.initializePlayerActivityProgress(ctx, uid, activityId, template as ActivityTemplate);
            }

            // 检查活动是否过期
            const nowISO = new Date().toISOString();
            if (nowISO > template.endDate) {
                await ctx.db.patch(progress._id, { status: "expired" });
                return {
                    success: false,
                    message: "活动已过期",
                };
            }

            // 更新进度
            const updatedProgress = this.calculateProgress(progress.progress, progressData, template.rules);
            const newMilestones = this.checkMilestones(updatedProgress, template.rules, progress.completedMilestones);

            // 更新数据库
            await ctx.db.patch(progress._id, {
                progress: updatedProgress,
                completedMilestones: [...progress.completedMilestones, ...newMilestones],
                lastUpdate: nowISO,
                updatedAt: nowISO,
            });

            // 自动发放奖励（如果配置为即时发放）
            let rewardsGranted = false;
            if (template.rules?.autoGrant !== false && newMilestones.length > 0) {
                for (const milestone of newMilestones) {
                    await this.grantMilestoneReward(ctx, uid, activityId, milestone, template);
                }
                rewardsGranted = true;
            }

            return {
                success: true,
                message: "活动进度更新成功",
                newMilestones,
                rewardsGranted,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `更新活动进度失败: ${error.message}`,
            };
        }
    }

    /**
     * 领取活动奖励
     */
    static async claimActivityReward(
        ctx: any,
        uid: string,
        activityId: string,
        milestone: string
    ): Promise<{
        success: boolean;
        message: string;
        rewards?: any;
    }> {
        try {
            // 获取活动模板
            const template = await ctx.db
                .query("activity_templates")
                .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
                .unique();

            if (!template) {
                return {
                    success: false,
                    message: "活动不存在",
                };
            }

            // 获取玩家进度
            const progress = await this.getPlayerActivityProgress(ctx, uid, activityId);
            if (!progress) {
                return {
                    success: false,
                    message: "玩家未参与该活动",
                };
            }

            // 检查里程碑是否已完成
            if (!progress.completedMilestones.includes(milestone)) {
                return {
                    success: false,
                    message: "里程碑未完成，无法领取奖励",
                };
            }

            // 检查奖励是否已领取
            if (progress.claimedRewards.includes(milestone)) {
                return {
                    success: false,
                    message: "奖励已领取",
                };
            }

            // 发放奖励
            const rewardResult = await this.grantMilestoneReward(ctx, uid, activityId, milestone, template);

            if (!rewardResult.success) {
                return rewardResult;
            }

            // 更新已领取记录
            const nowISO = new Date().toISOString();
            await ctx.db.patch(progress._id, {
                claimedRewards: [...progress.claimedRewards, milestone],
                updatedAt: nowISO,
            });

            return {
                success: true,
                message: "奖励领取成功",
                rewards: rewardResult.rewards,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `领取奖励失败: ${error.message}`,
            };
        }
    }

    /**
     * 处理登录活动
     */
    static async processLoginActivity(ctx: any, uid: string): Promise<{
        success: boolean;
        message: string;
        updatedActivities?: string[];
    }> {
        try {
            // 获取所有登录类型的活动
            const loginActivities = await ctx.db
                .query("activity_templates")
                .withIndex("by_type", (q: any) => q.eq("type", "login"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            const nowISO = new Date().toISOString();
            const updatedActivities: string[] = [];

            for (const activity of loginActivities) {
                // 检查活动时间
                if (nowISO < activity.startDate || nowISO > activity.endDate) {
                    continue;
                }

                // 获取或创建玩家进度
                let progress = await this.getPlayerActivityProgress(ctx, uid, activity.activityId);
                if (!progress) {
                    progress = await this.initializePlayerActivityProgress(ctx, uid, activity.activityId, activity as ActivityTemplate);
                }

                // 更新登录进度
                const rules = activity.rules;
                if (rules.type === "login") {
                    const progressData = await this.calculateLoginProgress(ctx, uid, progress, rules);
                    const result = await this.updateActivityProgress(ctx, uid, activity.activityId, progressData);
                    if (result.success) {
                        updatedActivities.push(activity.activityId);
                    }
                }
            }

            return {
                success: true,
                message: `处理登录活动完成，更新了 ${updatedActivities.length} 个活动`,
                updatedActivities,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `处理登录活动失败: ${error.message}`,
            };
        }
    }

    /**
     * 处理进度活动
     */
    static async processProgressActivity(
        ctx: any,
        uid: string,
        activityId: string,
        action: string,
        actionData: any
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        // 获取活动模板
        const template = await ctx.db
            .query("activity_templates")
            .withIndex("by_activityId", (q: any) => q.eq("activityId", activityId))
            .unique();

        if (!template || template.type !== "progress") {
            return {
                success: false,
                message: "活动不存在或类型不匹配",
            };
        }

        // 检查动作是否匹配活动规则
        const rules = template.rules;
        const matchingTargets = rules.targets?.filter((target: any) => target.action === action) || [];

        if (matchingTargets.length === 0) {
            return {
                success: false,
                message: "动作不匹配活动规则",
            };
        }

        // 更新进度
        const progressData = {
            action,
            increment: actionData.increment || 1,
            value: actionData.value,
        };

        return await this.updateActivityProgress(ctx, uid, activityId, progressData);
    }

    /**
     * 处理充值活动
     */
    static async processRechargeActivity(
        ctx: any,
        uid: string,
        amount: number
    ): Promise<{
        success: boolean;
        message: string;
        updatedActivities?: string[];
    }> {
        try {
            // 获取所有充值类型的活动
            const rechargeActivities = await ctx.db
                .query("activity_templates")
                .withIndex("by_type", (q: any) => q.eq("type", "recharge"))
                .filter((q: any) => q.eq(q.field("isActive"), true))
                .collect();

            const nowISO = new Date().toISOString();
            const updatedActivities: string[] = [];

            for (const activity of rechargeActivities) {
                // 检查活动时间
                if (nowISO < activity.startDate || nowISO > activity.endDate) {
                    continue;
                }

                // 更新充值进度
                const progressData = {
                    action: "recharge",
                    amount,
                };

                const result = await this.updateActivityProgress(ctx, uid, activity.activityId, progressData);
                if (result.success) {
                    updatedActivities.push(activity.activityId);
                }
            }

            return {
                success: true,
                message: `处理充值活动完成，更新了 ${updatedActivities.length} 个活动`,
                updatedActivities,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `处理充值活动失败: ${error.message}`,
            };
        }
    }

    // ============================================================================
    // 私有辅助方法
    // ============================================================================

    /**
     * 检查参与条件
     */
    static async checkRequirements(ctx: any, uid: string, requirements: any): Promise<boolean> {
        // 检查玩家等级
        if (requirements.playerLevel) {
            // 玩家等级由游戏模块管理，Tournament 模块不存储等级信息
            // TODO: 如果需要严格的等级检查，应该通过 HTTP 调用游戏模块获取玩家等级
            // 目前暂时跳过等级检查
            console.warn("活动要求包含玩家等级检查，但 Tournament 模块不存储玩家等级，跳过检查");
        }

        // 段位系统已移除，不再检查段位
        if (requirements.segmentName) {
            // 段位系统已移除，跳过段位检查
            console.warn("活动要求包含段位检查，但段位系统已移除，跳过检查");
        }

        return true;
    }

    /**
     * 计算可领取奖励
     */
    static calculateAvailableRewards(
        template: ActivityTemplate,
        progress?: PlayerActivityProgress
    ): string[] {
        if (!progress) return [];

        const available: string[] = [];
        const rules = template.rules;

        if (rules.type === "login" && rules.milestones) {
            for (const milestone of rules.milestones) {
                const milestoneId = `day_${milestone.day}`;
                if (
                    progress.completedMilestones.includes(milestoneId) &&
                    !progress.claimedRewards.includes(milestoneId)
                ) {
                    available.push(milestoneId);
                }
            }
        } else if (rules.type === "progress" && rules.targets) {
            for (const target of rules.targets) {
                if (
                    progress.completedMilestones.includes(target.id) &&
                    !progress.claimedRewards.includes(target.id)
                ) {
                    available.push(target.id);
                }
            }
        } else if (rules.type === "recharge" && rules.tiers) {
            for (const tier of rules.tiers) {
                const tierId = `tier_${tier.amount}`;
                if (
                    progress.completedMilestones.includes(tierId) &&
                    !progress.claimedRewards.includes(tierId)
                ) {
                    available.push(tierId);
                }
            }
        }

        return available;
    }

    /**
     * 获取初始进度
     */
    private static getInitialProgress(template: ActivityTemplate): any {
        const rules = template.rules;

        if (rules.type === "login") {
            return {
                consecutiveDays: 0,
                totalDays: 0,
                lastLoginDate: null,
            };
        } else if (rules.type === "progress") {
            const progress: any = {};
            if (rules.targets) {
                for (const target of rules.targets) {
                    progress[target.id] = 0;
                }
            }
            return progress;
        } else if (rules.type === "recharge") {
            return {
                totalAmount: 0,
            };
        }

        return {};
    }

    /**
     * 计算进度
     */
    private static calculateProgress(currentProgress: any, progressData: any, rules: any): any {
        if (rules.type === "login") {
            // 登录进度在 calculateLoginProgress 中处理
            return currentProgress;
        } else if (rules.type === "progress") {
            const updated = { ...currentProgress };
            if (progressData.action && rules.targets) {
                const target = rules.targets.find((t: any) => t.action === progressData.action);
                if (target) {
                    // 处理排行榜排名（记录最佳排名）
                    if (progressData.action === "leaderboard_rank" || progressData.action === "weekly_leaderboard_rank") {
                        const currentBestRank = updated[`${target.id}_bestRank`] || Infinity;
                        if (progressData.rank !== undefined && progressData.rank < currentBestRank) {
                            updated[`${target.id}_bestRank`] = progressData.rank;
                        }
                        // 记录是否达到目标排名（排名越小越好）
                        if (progressData.rank !== undefined && progressData.rank <= target.value) {
                            updated[target.id] = Math.max(updated[target.id] || 0, 1);
                        }
                    }
                    // 处理排行榜积分累计
                    else if (progressData.action === "leaderboard_score") {
                        updated[target.id] = (updated[target.id] || 0) + (progressData.increment || progressData.score || 0);
                    }
                    // 处理保持排名（连续天数）
                    else if (progressData.action === "maintain_leaderboard_rank") {
                        if (progressData.reset) {
                            // 重置连续天数
                            updated[target.id] = 0;
                        } else {
                            // 增加连续天数
                            updated[target.id] = (updated[target.id] || 0) + (progressData.increment || 1);
                        }
                    }
                    // 处理领取排行榜奖励
                    else if (progressData.action === "claim_leaderboard_reward") {
                        updated[target.id] = (updated[target.id] || 0) + (progressData.increment || 1);
                    }
                    // 默认处理
                    else {
                        updated[target.id] = (updated[target.id] || 0) + (progressData.increment || 1);
                    }
                }
            }
            return updated;
        } else if (rules.type === "recharge") {
            return {
                totalAmount: (currentProgress.totalAmount || 0) + (progressData.amount || 0),
            };
        }

        return currentProgress;
    }

    /**
     * 计算登录进度
     */
    private static async calculateLoginProgress(
        ctx: any,
        uid: string,
        progress: PlayerActivityProgress,
        rules: any
    ): Promise<any> {
        const nowISO = new Date().toISOString();
        const today = nowISO.split("T")[0];
        const lastLoginDate = progress.progress.lastLoginDate;

        let consecutiveDays = progress.progress.consecutiveDays || 0;
        let totalDays = progress.progress.totalDays || 0;

        if (rules.mode === "consecutive") {
            if (!lastLoginDate) {
                // 首次登录
                consecutiveDays = 1;
                totalDays = 1;
            } else {
                const lastDate = lastLoginDate.split("T")[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];

                if (lastDate === yesterdayStr || lastDate === today) {
                    // 连续登录
                    if (lastDate !== today) {
                        consecutiveDays += 1;
                        totalDays += 1;
                    }
                } else {
                    // 中断，重置连续天数
                    const resetDays = rules.consecutiveResetDays || 1;
                    const daysDiff = Math.floor(
                        (new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (daysDiff <= resetDays) {
                        consecutiveDays += 1;
                    } else {
                        consecutiveDays = 1;
                    }
                    totalDays += 1;
                }
            }
        } else {
            // 每日登录
            if (lastLoginDate !== today) {
                totalDays += 1;
            }
        }

        return {
            consecutiveDays,
            totalDays,
            lastLoginDate: today,
        };
    }

    /**
     * 检查里程碑
     */
    private static checkMilestones(
        progress: any,
        rules: any,
        completedMilestones: string[]
    ): string[] {
        const newMilestones: string[] = [];

        if (rules.type === "login" && rules.milestones) {
            const totalDays = progress.totalDays || 0;
            const consecutiveDays = progress.consecutiveDays || 0;

            for (const milestone of rules.milestones) {
                const milestoneId = `day_${milestone.day}`;
                if (!completedMilestones.includes(milestoneId)) {
                    const daysToCheck = rules.mode === "consecutive" ? consecutiveDays : totalDays;
                    if (daysToCheck >= milestone.day) {
                        newMilestones.push(milestoneId);
                    }
                }
            }
        } else if (rules.type === "progress" && rules.targets) {
            for (const target of rules.targets) {
                if (!completedMilestones.includes(target.id)) {
                    const currentValue = progress[target.id] || 0;

                    // 特殊处理排行榜排名（排名越小越好，所以检查是否达到或超过目标）
                    if (target.action === "leaderboard_rank" || target.action === "weekly_leaderboard_rank") {
                        const bestRank = progress[`${target.id}_bestRank`];
                        if (bestRank !== undefined && bestRank <= target.value) {
                            newMilestones.push(target.id);
                        }
                    }
                    // 处理累计积分和保持排名
                    else if (currentValue >= target.value) {
                        newMilestones.push(target.id);
                    }
                }
            }
        } else if (rules.type === "recharge" && rules.tiers) {
            const totalAmount = progress.totalAmount || 0;
            for (const tier of rules.tiers) {
                const tierId = `tier_${tier.amount}`;
                if (!completedMilestones.includes(tierId) && totalAmount >= tier.amount) {
                    newMilestones.push(tierId);
                }
            }
        }

        return newMilestones;
    }

    /**
     * 发放里程碑奖励
     */
    private static async grantMilestoneReward(
        ctx: any,
        uid: string,
        activityId: string,
        milestone: string,
        template: ActivityTemplate
    ): Promise<{
        success: boolean;
        message: string;
        rewards?: any;
    }> {
        try {
            const rules = template.rules;
            let rewards: UnifiedRewards | undefined;

            // 从规则中获取奖励
            if (rules.type === "login" && rules.milestones) {
                const milestoneData = rules.milestones.find((m: any) => `day_${m.day}` === milestone);
                if (milestoneData) {
                    rewards = milestoneData.rewards;
                }
            } else if (rules.type === "progress" && rules.targets) {
                const target = rules.targets.find((t: any) => t.id === milestone);
                if (target) {
                    rewards = target.rewards;
                }
            } else if (rules.type === "recharge" && rules.tiers) {
                const tier = rules.tiers.find((t: any) => `tier_${t.amount}` === milestone);
                if (tier) {
                    rewards = tier.rewards;
                }
            }

            if (!rewards) {
                return {
                    success: false,
                    message: "未找到奖励配置",
                };
            }

            // 调用统一奖励服务发放奖励
            const result = await RewardService.grantRewards(ctx, {
                uid,
                rewards: rewards as UnifiedRewards,
                source: {
                    source: "activity",
                    sourceId: activityId,
                    metadata: {
                        milestone,
                        activityName: template.name,
                    },
                },
                gameType: (rewards.monsters || rewards.monsterShards || rewards.energy) ? "tacticalMonster" : undefined,
            });

            if (!result.success) {
                return {
                    success: false,
                    message: result.message,
                };
            }

            return {
                success: true,
                message: "奖励发放成功",
                rewards: result.grantedRewards,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `发放奖励失败: ${error.message}`,
            };
        }
    }
}

