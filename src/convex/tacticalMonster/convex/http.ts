import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { GameSpecificRewardService } from "./service/reward/gameSpecificRewardService";
import { PlayerLevelService } from "./service/player/playerLevelService";

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
            const result = await GameSpecificRewardService.grantRewards(ctx, {
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
http.route({
    path: "/grantPlayerExperience",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const { uid, exp, source, sourceId } = body;

            // 参数验证
            if (!uid || !exp || exp <= 0) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "缺少必要参数: uid, exp (必须大于0)",
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

            // 调用玩家等级服务
            const result = await PlayerLevelService.addExperience(ctx, {
                uid,
                exp,
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
            console.error("发放玩家经验值失败:", error);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: error.message || "发放经验值失败",
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

            // 导入计算函数
            const { calculateTaskExp } = await import("./service/player/playerExpCalculation");
            
            const exp = calculateTaskExp(
                taskType as "daily" | "weekly" | "achievement",
                (taskDifficulty as "easy" | "medium" | "hard") || "medium",
                taskRewardValue || 0
            );

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

            // 导入计算函数
            const { calculateTournamentExp } = await import("./service/player/playerExpCalculation");
            
            const exp = calculateTournamentExp(
                rank,
                totalParticipants,
                tier || "bronze"
            );

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

            // 导入计算函数
            const { calculateActivityExp } = await import("./service/player/playerExpCalculation");
            
            const exp = calculateActivityExp(activityMultiplier || 1.0);

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
export default http;

