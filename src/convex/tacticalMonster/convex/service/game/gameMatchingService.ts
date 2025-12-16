import { v } from "convex/values";
import { api } from "../../_generated/api";
import { action } from "../../_generated/server";
import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../config/tournamentConfig";
import { TIER_CONFIGS } from "../../data/tierConfigs";
import { TierMappingService } from "../tier/tierMappingService";

/**
 * 匹配服务
 * 处理玩家加入匹配队列的请求
 * 注意：使用 action 因为需要调用 Tournament 模块的 HTTP 接口
 */
export const joinTournamentMatching = action({
    args: {
        uid: v.string(),
        tournamentId: v.optional(v.string()),
        tournamentType: v.string(),
        tier: v.optional(v.string()),  // 前端可能传入，但会被后端验证覆盖
    },
    handler: async (ctx, args) => {
        // 1. 验证队伍是否有效（最多4个怪物）
        // 注意：在 action 中需要通过 runQuery 调用 query
        // 使用字符串路径访问 API（兼容 API 类型可能还未更新的情况）
        const validateTeamQuery = (api as any)["service/team/teamService"]?.validateTeam;
        if (!validateTeamQuery) {
            throw new Error("validateTeam query 未找到（请运行 npx convex dev 重新生成API）");
        }
        const teamValidation = await ctx.runQuery(validateTeamQuery, { uid: args.uid });
        if (!teamValidation.valid) {
            throw new Error(`队伍验证失败: ${teamValidation.reason}`);
        }

        // 2. 从 tournamentType 推导权威 Tier
        const authoritativeTier = TierMappingService.getTierFromTournamentType(args.tournamentType);
        if (!authoritativeTier) {
            throw new Error(`无法从 tournamentType 推导 Tier: ${args.tournamentType}`);
        }

        // 3. 验证前端传入的 Tier（如果存在）
        if (args.tier && args.tier !== authoritativeTier) {
            throw new Error(`Tier 不一致: 前端传入 ${args.tier}，实际应为 ${authoritativeTier}`);
        }

        // 4. 验证 Power 范围（只验证Power，等级验证在 Tournament 模块进行）
        // 注意：Power 基于上场队伍（teamPosition 不为 null 的怪物，最多4个）计算
        // 玩家可以通过选择低 Power 的队伍来加入低 Tier 锦标赛
        // 在 action 中需要通过 runQuery 调用 query
        // 使用字符串路径访问 API（兼容 API 类型可能还未更新的情况）
        const validatePowerRangeQuery = (api as any)["service/tier/monsterRumbleTierService"]?.validatePowerRange;
        if (!validatePowerRangeQuery) {
            throw new Error("validatePowerRange query 未找到（请运行 npx convex dev 重新生成API）");
        }
        const powerValidation = await ctx.runQuery(validatePowerRangeQuery, {
            uid: args.uid,
            tier: authoritativeTier,
        });

        if (!powerValidation.valid) {
            throw new Error(`Power 验证失败: ${powerValidation.reason}`);
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
                            teamPower: powerValidation.teamPower!,
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

            // 6. 匹配成功，返回 gameId 和 matchId
            // 
            // 设计说明：采用延迟创建（Lazy Creation）策略
            // - 游戏实例不在匹配成功时立即创建
            // - 而是在玩家调用 loadGame 时按需创建
            // 
            // 优势：
            // - 资源效率高：避免为未进入游戏的玩家创建实例
            // - 实现简单：无需维护回调机制和状态管理
            // - 容错性好：匹配流程与游戏实例创建解耦
            //
            // 注意：如果未来需要优化玩家体验（减少首次加载延迟），
            // 可以考虑实现混合方案（立即回调 + 延迟创建）

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

