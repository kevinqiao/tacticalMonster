import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { TierMappingService } from "../tier/tierMappingService";
import { MonsterRumbleTierService } from "../tier/monsterRumbleTierService";
import { TIER_CONFIGS } from "../../data/tierConfigs";
import { getTournamentUrl } from "../../config/tournamentConfig";
import { TOURNAMENT_CONFIG } from "../../config/tournamentConfig";
import { internal } from "../../_generated/api";

/**
 * 匹配服务
 * 处理玩家加入匹配队列的请求
 */
export const joinTournamentMatching = mutation({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        tournamentType: v.string(),
        tier: v.optional(v.string()),  // 前端可能传入，但会被后端验证覆盖
    },
    handler: async (ctx, args) => {
        // 1. 从 tournamentType 推导权威 Tier
        const authoritativeTier = TierMappingService.getTierFromTournamentType(args.tournamentType);
        if (!authoritativeTier) {
            throw new Error(`无法从 tournamentType 推导 Tier: ${args.tournamentType}`);
        }
        
        // 2. 验证前端传入的 Tier（如果存在）
        if (args.tier && args.tier !== authoritativeTier) {
            throw new Error(`Tier 不一致: 前端传入 ${args.tier}，实际应为 ${authoritativeTier}`);
        }
        
        // 3. 验证 Tier 访问权限
        const validation = await MonsterRumbleTierService.validateTierAccess(
            ctx,
            args.uid,
            authoritativeTier
        );
        
        if (!validation.valid) {
            throw new Error(`Tier 访问验证失败: ${validation.reason}`);
        }
        
        // 4. 验证入场费用（简化：假设费用验证通过）
        const tierConfig = TIER_CONFIGS[authoritativeTier as keyof typeof TIER_CONFIGS];
        // TODO: 实现费用扣除逻辑
        
        // 5. 调用 Tournament 匹配服务（HTTP 调用）
        try {
            const response = await fetch(
                getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.JOIN_MATCHING_QUEUE),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: args.uid,
                        tournamentId: args.tournamentId,
                        typeId: args.tournamentType,
                        gameType: "monsterRumble",
                        metadata: {
                            tier: authoritativeTier,
                            teamPower: validation.teamPower!,
                        },
                    }),
                }
            );
            
            const matchResult = await response.json();
            
            if (!response.ok || !matchResult.ok) {
                return {
                    ok: false,
                    inQueue: matchResult.inQueue || false,
                    error: matchResult.error || "匹配失败",
                };
            }
            
            // 6. 如果匹配成功，创建游戏实例（这里简化处理，实际应在游戏开始回调中创建）
            // 注意：游戏实例的创建应该在匹配成功后由 Tournament 回调或定时任务触发
            
            return {
                ok: true,
                gameId: matchResult.gameId,
                matchId: matchResult.matchId,
                inQueue: false,
            };
        } catch (error: any) {
            console.error("调用 Tournament 匹配服务失败:", error);
            throw new Error(`匹配服务调用失败: ${error.message}`);
        }
    },
});

