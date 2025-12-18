import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { getTournamentUrl } from "./config/tournamentConfig";
import { RewardService } from "./service/reward/rewardService";

const http = httpRouter();

/**
 * 游戏特定奖励发放端点
 * 供 Tournament 模块调用
 */
http.route({
    path: "/grantGameSpecificRewards",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { uid, rewards, source, sourceId } = body;

            // 参数验证
            if (!uid || !rewards) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: uid, rewards",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 调用游戏特定奖励服务
            const result = await RewardService.grantRewards(ctx, {
                uid,
                rewards,
                source: source || "reward",
                sourceId,
            });

            return new Response(JSON.stringify(result), {
                status: result.success ? 200 : 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        } catch (error: any) {
            console.error("发放游戏特定奖励失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "发放奖励失败",
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 玩家经验值奖励发放端点
 * 供 Tournament 模块调用
 */
// 注意：玩家经验值相关端点已迁移到 Tournament 模块
// /grantPlayerExperience 端点已删除，现在 Tournament 模块内部直接处理

/**
 * 计算任务经验值端点
 * 供 Tournament 模块调用
 */
http.route({
    path: "/calculateTaskExp",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { taskType, taskDifficulty, taskRewardValue } = body;

            // 参数验证
            if (!taskType) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: taskType",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 注意：经验值计算已迁移到 Tournament 模块
            // 通过 HTTP 调用 Tournament 模块的计算端点
            const tournamentUrl = getTournamentUrl("/calculateTaskExp");
            const response = await fetch(tournamentUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskType, taskDifficulty, taskRewardValue }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            const exp = responseData.exp || 0;

            return new Response(
                JSON.stringify({
                    success: true,
                    exp,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算任务经验值失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算经验值失败",
                    exp: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 计算锦标赛经验值端点
 * 供 Tournament 模块调用
 */
http.route({
    path: "/calculateTournamentExp",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { rank, totalParticipants, tier } = body;

            // 参数验证
            if (!rank || !totalParticipants) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: rank, totalParticipants",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 注意：经验值计算已迁移到 Tournament 模块
            // 通过 HTTP 调用 Tournament 模块的计算端点
            const tournamentUrl = getTournamentUrl("/calculateTournamentExp");
            const response = await fetch(tournamentUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rank, totalParticipants, tier }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            const exp = responseData.exp || 0;

            return new Response(
                JSON.stringify({
                    success: true,
                    exp,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算锦标赛经验值失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算经验值失败",
                    exp: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 计算活动经验值端点
 * 供 Tournament 模块调用
 */
http.route({
    path: "/calculateActivityExp",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { activityMultiplier } = body;

            // 注意：经验值计算已迁移到 Tournament 模块
            // 通过 HTTP 调用 Tournament 模块的计算端点
            const tournamentUrl = getTournamentUrl("/calculateActivityExp");
            const response = await fetch(tournamentUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activityMultiplier }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            const exp = responseData.exp || 0;

            return new Response(
                JSON.stringify({
                    success: true,
                    exp,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算活动经验值失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算经验值失败",
                    exp: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 计算游戏完成赛季积分端点
 * 供 Tournament 模块调用
 */
http.route({
    path: "/calculateMonsterRumblePoints",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { rank, score, tier } = body;

            // 参数验证
            if (!rank) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: rank",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 导入计算函数
            const { calculateMonsterRumblePoints } = await import("./service/calculation/seasonPoints");

            const points = calculateMonsterRumblePoints(
                rank,
                score || 0,
                tier || "bronze"
            );

            return new Response(
                JSON.stringify({
                    success: true,
                    points,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算游戏完成赛季积分失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算积分失败",
                    points: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 计算升级赛季积分端点
 */
http.route({
    path: "/calculateUpgradePoints",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { rarity, level, previousLevel } = body;

            // 参数验证
            if (!rarity || !level) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: rarity, level",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 导入计算函数
            const { calculateUpgradePoints } = await import("./service/calculation/seasonPoints");

            const points = calculateUpgradePoints(
                rarity,
                level,
                previousLevel || 0
            );

            return new Response(
                JSON.stringify({
                    success: true,
                    points,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算升级赛季积分失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算积分失败",
                    points: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 计算升星赛季积分端点
 */
http.route({
    path: "/calculateStarUpPoints",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { rarity, stars } = body;

            // 参数验证
            if (!rarity || !stars) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: rarity, stars",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 导入计算函数
            const { calculateStarUpPoints } = await import("./service/calculation/seasonPoints");

            const points = calculateStarUpPoints(rarity, stars);

            return new Response(
                JSON.stringify({
                    success: true,
                    points,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算升星赛季积分失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算积分失败",
                    points: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 计算宝箱开启赛季积分端点
 */
http.route({
    path: "/calculateChestPoints",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { chestType } = body;

            // 参数验证
            if (!chestType) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: chestType",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 导入计算函数
            const { calculateChestPoints } = await import("./service/calculation/seasonPoints");

            const points = calculateChestPoints(chestType);

            return new Response(
                JSON.stringify({
                    success: true,
                    points,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算宝箱开启赛季积分失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算积分失败",
                    points: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 计算 Boss 击败赛季积分端点
 */
http.route({
    path: "/calculateBossDefeatPoints",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { bossDifficulty } = body;

            // 参数验证
            if (!bossDifficulty) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: bossDifficulty",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            // 导入计算函数
            const { calculateBossDefeatPoints } = await import("./service/calculation/seasonPoints");

            const points = calculateBossDefeatPoints(bossDifficulty);

            return new Response(
                JSON.stringify({
                    success: true,
                    points,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("计算 Boss 击败赛季积分失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "计算积分失败",
                    points: 0,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});



// Convex expects the router to be the default export of `convex/http.js`.
/**
 * 获取 StageRuleConfig（原 GameRuleConfig）
 * 供 Tournament 模块查询
 */
http.route({
    path: "/getGameRuleConfig",  // 保持路径不变以保持 API 兼容性
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { ruleId } = body;

            if (!ruleId) {
                return new Response(
                    JSON.stringify({
                        ok: false,
                        error: "缺少必要参数: ruleId",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            const { GameRuleConfigService } = await import("./service/game/gameRuleConfigService");
            const config = GameRuleConfigService.getGameRuleConfig(ruleId);

            return new Response(
                JSON.stringify({
                    ok: true,
                    config: config || null,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("获取 StageRuleConfig 失败:", error);
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: error.message || "获取配置失败",
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

/**
 * 获取宝箱类型权重配置
 * 供 Tournament 模块查询
 */
http.route({
    path: "/getChestTypeWeights",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { ruleId, tier } = body;

            if (!ruleId) {
                return new Response(
                    JSON.stringify({
                        ok: false,
                        error: "缺少必要参数: ruleId",
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    }
                );
            }

            const { GameRuleConfigService } = await import("./service/game/gameRuleConfigService");
            const weights = GameRuleConfigService.getChestTypeWeights(ruleId, tier);

            return new Response(
                JSON.stringify({
                    ok: true,
                    weights,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        } catch (error: any) {
            console.error("获取宝箱类型权重失败:", error);
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: error.message || "获取权重失败",
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }
    }),
});

export default http;

