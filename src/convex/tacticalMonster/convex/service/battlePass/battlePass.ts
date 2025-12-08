/**
 * Battle Pass Convex API
 * 提供给前端调用的 Battle Pass 接口
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { BattlePassIntegration } from "./battlePassIntegration";

/**
 * 添加游戏赛季积分（内部调用）
 */
export const addGameSeasonPoints = mutation({
    args: {
        uid: v.string(),
        amount: v.number(),
        source: v.string(),
        sourceDetails: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await BattlePassIntegration.addGameSeasonPoints(ctx, {
            uid: args.uid,
            amount: args.amount,
            source: args.source,
            sourceDetails: args.sourceDetails,
        });
    },
});

/**
 * 注意：Battle Pass 奖励领取已移除
 * 前端应直接调用 Tournament 模块的 /claimBattlePassReward 接口
 * 如果奖励中包含游戏特有资源，Tournament 模块会调用 TacticalMonster 的 /grantGameSpecificRewards 端点
 */

/**
 * 购买 Premium Battle Pass
 */
export const purchasePremiumPass = mutation({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        return await BattlePassIntegration.purchasePremiumPass(ctx, {
            uid: args.uid,
        });
    },
});

/**
 * 获取 Battle Pass 进度（带游戏数据）
 */
export const getBattlePassWithGameData = query({
    args: {
        uid: v.string(),
    },
    handler: async (ctx, args) => {
        return await BattlePassIntegration.getBattlePassWithGameData(ctx, {
            uid: args.uid,
        });
    },
});

/**
 * 获取当前 Battle Pass 配置
 */
export const getCurrentBattlePassConfig = query({
    args: {},
    handler: async (ctx, args) => {
        try {
            const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
            const response = await fetch(
                `${tournamentUrl}/getCurrentBattlePassConfig`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.config || null;
        } catch (error: any) {
            console.error("获取 Battle Pass 配置失败:", error);
            return null;
        }
    },
});

