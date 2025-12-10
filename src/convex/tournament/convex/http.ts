import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";


const http = httpRouter();

http.route({
  path: "/match/check",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // const body = await request.json();
    // console.log("check match", body);
    // const mid = body.matchId;
    // const match = await ctx.runQuery(internal.dao.matchDao.find, { mid });
    // console.log("match", match);
    // const status = match?.status ?? 0;
    // const result = { ok: status < 2 };

    // return new Response(JSON.stringify(result), {
    //   status: 200,
    //   headers: new Headers({
    //     "Access-Control-Allow-Origin": "*",
    //     "Content-Type": "application/json",
    //   }),
    // });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
    });
  }),
});




// 添加 OPTIONS 处理
http.route({
  path: "/signin",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      }),
    });
  }),
});
http.route({
  path: "/signout",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});
http.route({
  path: "/findMatchGame",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body: { gameId: string } = await request.json();
    const match = await ctx.runQuery(internal.service.tournament.matchManager.findMatchGame, { gameId: body.gameId });
    const result = { ok: match ? true : false, match };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",

      }),
    });
  }),
});
http.route({
  path: "/submitGameScore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body: { gameId: string, score: number } = await request.json();
    const res = await ctx.runMutation(internal.service.tournament.matchManager.submitGameScore, { gameId: body.gameId, score: body.score });

    return new Response(JSON.stringify(res), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",

      }),
    });
  }),
});
http.route({
  path: "/test",
  method: "POST",
  handler: httpAction(async (_, request) => {
    const body = await request.json();
    console.log("test", body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
    });
  }),
});
http.route({
  path: "/signin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log("signin", body);
    const accessToken = body.access_token;
    const player = await ctx.runAction(internal.service.auth.signin, {
      access_token: accessToken,
      expire: body.expire
    });

    // 如果登录成功，处理任务管理（异步，不阻塞登录响应）
    if (player && player.uid) {
      try {
        const { TaskSystem } = await import("./service/task/taskSystem");
        // 异步处理任务事件和管理任务
        TaskSystem.processTaskEvent(ctx, {
          uid: player.uid,
          action: "login",
          actionData: { increment: 1 },
        }).catch((error) => {
          console.error(`为玩家 ${player.uid} 处理登录任务事件失败:`, error);
        });

        TaskSystem.managePlayerTasks(ctx, player.uid).catch((error) => {
          console.error(`为玩家 ${player.uid} 管理任务失败:`, error);
        });
      } catch (error) {
        console.error("处理任务系统失败:", error);
      }
    }

    return new Response(JSON.stringify({ ok: player !== null, player }), {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      })
    });
  }),
});
http.route({
  path: "/signout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log("signout", body);
    try {

      const player: any = await ctx.runQuery(internal.dao.playerDao.find, { uid: body.uid });
      console.log("player", player);
      // if (player) {
      //   await ctx.runMutation(internal.dao.gamePlayerDao.update, {
      //     uid: body.uid,
      //     data: { token: null }
      //   });
      // }
    } catch (error) {
      console.error("signout error", error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      })
    });
  }),
});

// ============================================================================
// Player Authentication HTTP API 端点
// ============================================================================

http.route({
  path: "/authenticate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, token } = body;

      // 参数验证
      if (!uid || !token) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid, token"
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

      // 调用 PlayerManager.authenticate
      const player = await ctx.runMutation(internal.service.playerManager.authenticate, {
        uid,
        token,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          player: player || null,
          message: player ? "玩家已存在" : "玩家创建成功",
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
      console.error("authenticate 失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "authenticate 失败",
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

http.route({
  path: "/authenticate",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }),
    });
  }),
});
// 添加游戏奖励处理端点
http.route({
  path: "/processGameRewards",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. 解析请求体
      const body = await request.json();
      const { tier, rankings, gameId } = body;

      // 2. 参数验证
      if (!tier || !rankings || !gameId) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: tier, rankings, gameId"
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

      // 3. 导入并使用 TierRewardService
      const { TierRewardService } = await import("./service/tournament/tierRewardService");

      // 4. 调用业务逻辑处理奖励
      const rewardDecision = await TierRewardService.processGameRewards(ctx, {
        tier,
        rankings,
        gameId,
      });

      // 5. 返回奖励决策（包含发放结果和宝箱触发决策）
      return new Response(
        JSON.stringify({
          ok: true,
          coinRewards: rewardDecision.coinRewards,
          chestTriggered: rewardDecision.chestTriggered,  // 宝箱触发决策
          rewardType: rewardDecision.rewardType,
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
      // 6. 错误处理
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "处理奖励失败",
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

http.route({
  path: "/notifyGameEnd",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. 解析请求体
      const body = await request.json();
      const { gameId, matchId, finalScore } = body;

      // 2. 参数验证
      if (!gameId || !matchId) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: gameId, matchId",
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

      // 3. 调用内部 mutation 处理游戏结束通知
      const result = await ctx.runMutation(internal.service.tournament.matchManager.notifyGameEnd, {
        gameId,
        matchId,
        finalScore: finalScore || 0,
      });

      // 4. 返回结果
      return new Response(
        JSON.stringify(result),
        {
          status: result.ok ? 200 : 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error: any) {
      console.error("处理游戏结束通知失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "处理失败",
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

// ============================================================================
// Task System HTTP API 端点
// ============================================================================

http.route({
  path: "/processTaskEvent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, action, actionData, gameType, tournamentId, matchId } = body;

      // 参数验证
      if (!uid || !action || !actionData) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid, action, actionData",
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

      // 导入任务系统
      const { TaskSystem } = await import("./service/task/taskSystem");

      // 调用任务系统处理事件
      const result = await TaskSystem.processTaskEvent(ctx, {
        uid,
        action,
        actionData,
        gameType,
        tournamentId,
        matchId,
      });

      return new Response(
        JSON.stringify({
          ok: result.success,
          success: result.success,
          message: result.message,
          updatedTasks: result.updatedTasks,
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
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "处理任务事件失败",
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

http.route({
  path: "/managePlayerTasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid } = body;

      // 参数验证
      if (!uid) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid",
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

      // 导入任务系统
      const { TaskSystem } = await import("./service/task/taskSystem");

      // 调用任务系统管理任务
      const result = await TaskSystem.managePlayerTasks(ctx, uid);

      return new Response(
        JSON.stringify({
          ok: result.success,
          success: result.success,
          message: result.message,
          allocatedTasks: result.allocatedTasks,
          movedTasks: result.movedTasks,
          totalExpired: result.totalExpired,
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
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "管理玩家任务失败",
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

http.route({
  path: "/getPlayerActiveTasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid } = body;

      // 参数验证
      if (!uid) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid",
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

      // 导入任务系统
      const { TaskSystem } = await import("./service/task/taskSystem");

      // 获取玩家活跃任务
      const tasks = await TaskSystem.getPlayerActiveTasks(ctx, uid);

      return new Response(
        JSON.stringify({
          ok: true,
          tasks,
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
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "获取玩家任务失败",
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

http.route({
  path: "/claimTaskRewards",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, taskId } = body;

      // 参数验证
      if (!uid || !taskId) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid, taskId",
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

      // 导入任务系统
      const { TaskSystem } = await import("./service/task/taskSystem");

      // 领取任务奖励
      const result = await TaskSystem.claimTaskRewards(ctx, {
        uid,
        taskId,
      });

      return new Response(
        JSON.stringify({
          ok: result.success,
          success: result.success,
          message: result.message,
          rewards: result.rewards,
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
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "领取任务奖励失败",
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

// ============================================================================
// Battle Pass HTTP API 端点
// ============================================================================

http.route({
  path: "/addSeasonPoints",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, seasonPointsAmount, source, sourceDetails } = body;

      // 参数验证
      if (!uid || seasonPointsAmount === undefined || !source) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid, seasonPointsAmount, source",
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

      // 导入 Battle Pass 系统
      const { BattlePassSystem } = await import("./service/battlePass/battlePassSystem");

      // 调用 Battle Pass 系统添加积分
      const result = await BattlePassSystem.addSeasonPoints(
        ctx,
        uid,
        seasonPointsAmount,
        source
      );

      return new Response(
        JSON.stringify({
          ok: result.success,
          success: result.success,
          newLevel: result.newLevel,
          levelIncreased: result.levelIncreased,
          message: result.message,
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
      console.error("添加赛季积分失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "添加积分失败",
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

http.route({
  path: "/getBattlePassClaimableLevels",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid } = body;

      // 参数验证
      if (!uid) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid",
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

      // 导入 Battle Pass 系统
      const { BattlePassSystem } = await import("./service/battlePass/battlePassSystem");

      // 获取可领取的等级列表
      const claimableLevels = await BattlePassSystem.getClaimableLevels(ctx, uid);

      return new Response(
        JSON.stringify({
          ok: true,
          claimableLevels,
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
      console.error("获取可领取等级失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "获取可领取等级失败",
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

http.route({
  path: "/claimBattlePassReward",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, level } = body;

      // 参数验证
      if (!uid || level === undefined) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid, level",
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

      // 导入 Battle Pass 系统
      const { BattlePassSystem } = await import("./service/battlePass/battlePassSystem");

      // 调用 Battle Pass 系统领取奖励（玩家主动发起）
      const result = await BattlePassSystem.claimBattlePassRewards(ctx, uid, level);

      return new Response(
        JSON.stringify({
          ok: result.success,
          success: result.success,
          message: result.message,
          rewards: result.rewards,
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
      console.error("领取 Battle Pass 奖励失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "领取奖励失败",
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

http.route({
  path: "/purchasePremiumBattlePass",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid } = body;

      if (!uid) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid",
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

      // 导入 Battle Pass 系统
      const { BattlePassSystem } = await import("./service/battlePass/battlePassSystem");

      const result = await BattlePassSystem.purchasePremiumBattlePass(ctx, uid);

      return new Response(
        JSON.stringify({
          ok: result.success,
          success: result.success,
          message: result.message,
          battlePass: result.battlePass,
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
      console.error("购买 Premium Battle Pass 失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "购买失败",
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

http.route({
  path: "/getPlayerBattlePass",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const uid = url.searchParams.get("uid");

      if (!uid) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: uid",
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

      // 导入 Battle Pass 系统
      const { BattlePassSystem } = await import("./service/battlePass/battlePassSystem");

      const battlePass = await BattlePassSystem.getPlayerBattlePass(ctx, uid);

      return new Response(
        JSON.stringify({
          ok: true,
          battlePass: battlePass,
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
      console.error("获取 Battle Pass 进度失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "获取进度失败",
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

http.route({
  path: "/getCurrentBattlePassConfig",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // 导入 Battle Pass 系统
      const { BattlePassSystem } = await import("./service/battlePass/battlePassSystem");

      const config = BattlePassSystem.getCurrentBattlePassConfig();

      return new Response(
        JSON.stringify({
          ok: true,
          config: config,
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
      console.error("获取 Battle Pass 配置失败:", error);
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

// 奖励系统 HTTP 端点
http.route({
  path: "/grantRewards",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      // 直接导入并使用 RewardService，避免 internal API 类型问题
      const { RewardService } = await import("./service/reward/rewardService");
      const result = await RewardService.grantRewards(ctx, {
        uid: body.uid,
        rewards: body.rewards,
        source: {
          source: body.source,
          sourceId: body.sourceId,
          metadata: body.metadata,
        },
        gameType: body.gameType,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: new Headers({
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        }),
      });
    } catch (error: any) {
      console.error("发放奖励失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message || "发放奖励失败",
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

// ============================================================================
// Activity System HTTP API 端点
// ============================================================================

http.route({
  path: "/processActivityEvent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, eventType, activityId, action, actionData, amount } = body;

      // 参数验证
      if (!uid || !eventType) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "缺少必要参数: uid, eventType",
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

      // 导入活动服务
      const { ActivityService } = await import("./service/activity/activityService");

      let result;
      switch (eventType) {
        case "login":
          result = await ActivityService.processLoginActivity(ctx, uid);
          break;
        case "progress":
          if (!activityId || !action) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "进度活动需要提供 activityId 和 action",
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
          result = await ActivityService.processProgressActivity(
            ctx,
            uid,
            activityId,
            action,
            actionData || {}
          );
          break;
        case "recharge":
          if (amount === undefined) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "充值活动需要提供 amount",
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
          result = await ActivityService.processRechargeActivity(ctx, uid, amount);
          break;
        default:
          return new Response(
            JSON.stringify({
              success: false,
              message: `未知的事件类型: ${eventType}`,
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

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error: any) {
      console.error("处理活动事件失败:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || "处理活动事件失败",
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

// ============================================================================
// Tournament Type Config HTTP API 端点
// ============================================================================

http.route({
  path: "/getTournamentTypeConfig",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { typeId } = body;

      // 参数验证
      if (!typeId) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "缺少必要参数: typeId"
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

      // 查询 tournament_types 表（通过 runQuery 调用 internal query）
      const tournamentType = await ctx.runQuery(
        internal.dao.tournamentDao.findTypeById,
        { typeId }
      );

      if (!tournamentType) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `锦标赛类型不存在: ${typeId}`
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // 返回配置（只返回 entryRequirements 部分）
      return new Response(
        JSON.stringify({
          ok: true,
          config: {
            typeId: tournamentType.typeId,
            entryRequirements: tournamentType.entryRequirements || {},
          },
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
      console.error("获取锦标赛类型配置失败:", error);
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

// ============================================================================
// Tournament Matching HTTP API 端点
// ============================================================================

http.route({
  path: "/joinMatchingQueue",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, tournamentId, typeId, gameType, metadata } = body;

      // 参数验证
      if (!uid || !typeId) {
        return new Response(
          JSON.stringify({
            ok: false,
            success: false,
            error: "缺少必要参数: uid, typeId"
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

      // 导入匹配服务
      const { TournamentMatchingService } = await import("./service/tournament/tournamentMatchingService");

      // 调用匹配服务
      const result = await TournamentMatchingService.joinMatchingQueue(ctx, {
        uid,
        tournamentId: tournamentId || undefined,
        typeId,
        gameType: gameType || undefined,
        metadata: metadata || undefined,
      });

      // 返回结果
      return new Response(
        JSON.stringify({
          ok: result.success !== false,
          success: result.success,
          queueId: result.queueId,
          status: result.status,
          message: result.message,
          inQueue: result.status === "already_in_queue" || result.status === "joined",
          error: result.error,
        }),
        {
          status: result.success !== false ? 200 : 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error: any) {
      console.error("加入匹配队列失败:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          success: false,
          error: error.message || "加入匹配队列失败",
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

// ============================================================================
// 测试工具 Actions（用于在 Dashboard 中测试 HTTP 端点）
// ============================================================================

import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * 测试 /authenticate 端点
 * 用于在 Convex Dashboard 中测试玩家创建功能
 */
export const testAuthenticate = action({
  args: {
    uid: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";

    console.log(`[testAuthenticate] 测试 /authenticate 端点`);
    console.log(`UID: ${args.uid}`);
    console.log(`Token: ${args.token}`);

    try {
      const response = await fetch(`${tournamentUrl}/authenticate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: args.uid,
          token: args.token,
        }),
      });

      const result = await response.json();

      console.log(`响应状态: ${response.status}`);
      console.log(`响应数据:`, JSON.stringify(result, null, 2));

      return {
        success: response.ok,
        status: response.status,
        result,
      };
    } catch (error: any) {
      console.error(`请求失败:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * 验证玩家和库存是否创建成功
 * 用于在 Convex Dashboard 中验证测试结果
 */
export const verifyPlayerCreated = action({
  args: { uid: v.string() },
  handler: async (ctx, args) => {
    const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";

    console.log(`[verifyPlayerCreated] 验证玩家: ${args.uid}`);

    try {
      const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${args.uid}`);
      const data = await response.json();

      console.log(`库存查询结果:`, JSON.stringify(data, null, 2));

      return {
        success: response.ok,
        inventoryExists: !!data.inventory,
        coins: data.inventory?.coins,
        data,
      };
    } catch (error: any) {
      console.error(`验证失败:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * 计算宝箱类型预览（基于 Tier 和排名）
 * 注意：这是预览值，实际宝箱类型在 Claim 时可能因槽位情况而不同
 */
function calculateChestTypePreview(tier: string, rank: number): string {
  // 使用与 ChestService.selectChestType 相同的逻辑（简化版）
  // 但使用预期值而非随机值，以便前端显示一致
  if (rank === 1) {
    // 第一名：返回最高概率的高级宝箱
    if (tier === "platinum") return "orange";
    if (tier === "gold") return "orange";
    if (tier === "silver") return "purple";
    return "gold";
  } else if (rank <= 3) {
    // Top3：返回中等概率的高级宝箱
    if (tier === "platinum") return "purple";
    if (tier === "gold") return "purple";
    if (tier === "silver") return "gold";
    return "gold";
  } else {
    // 其他排名：返回基础类型
    if (tier === "platinum") return "purple";
    if (tier === "gold") return "gold";
    if (tier === "silver") return "silver";
    return "silver";
  }
}

/**
 * 获取玩家锦标赛结算结果（用于前端显示）
 * 返回结算后的奖励预览信息
 */
http.route({
  path: "/getTournamentResult",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const uid = url.searchParams.get("uid");
      const tournamentId = url.searchParams.get("tournamentId");

      if (!uid || !tournamentId) {
        return new Response(JSON.stringify({
          ok: false,
          error: "缺少必要参数: uid, tournamentId"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 1. 获取玩家锦标赛记录
      const playerTournament = await ctx.runQuery(
        internal.dao.tournamentDao.getPlayerTournament,
        { uid, tournamentId }
      );

      if (!playerTournament) {
        return new Response(JSON.stringify({
          ok: false,
          error: "锦标赛记录不存在"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 2. 获取锦标赛信息
      const tournament = await ctx.runQuery(
        internal.dao.tournamentDao.getTournament,
        { tournamentId }
      );

      // 导入 TournamentStatus
      const { TournamentStatus } = await import("./service/tournament/common");

      // 3. 构建响应数据
      const rewards = playerTournament.rewards || {};
      const chestInfo = rewards.chestInfo || {};

      // 4. 计算宝箱类型预览（基于 Tier 和排名）
      // 注意：这是预览，实际宝箱类型在 Claim 时根据槽位情况可能不同
      let chestTypePreview: string | null = null;
      if (chestInfo.chestTriggered) {
        chestTypePreview = calculateChestTypePreview(chestInfo.tier, chestInfo.rank);
      }

      return new Response(JSON.stringify({
        ok: true,
        tournament: {
          tournamentId: tournamentId,
          name: (tournament as any)?.name || "锦标赛",
          status: tournament?.status || "unknown",
        },
        playerResult: {
          rank: playerTournament.rank || null,
          score: playerTournament.score || 0,
          status: playerTournament.status,  // SETTLED(2) | COLLECTED(3)
          settledAt: (playerTournament as any).settledAt || null,
          collectedAt: (playerTournament as any).collectedAt || null,
        },
        rewards: {
          // 积分奖励（已计算，待领取）
          rankPoints: rewards.rankPoints || 0,
          seasonPoints: rewards.seasonPoints || 0,
          prestigePoints: rewards.prestigePoints || 0,
          achievementPoints: rewards.achievementPoints || 0,
          tournamentPoints: rewards.tournamentPoints || 0,
          // 金币奖励（待领取）
          coins: rewards.coins || 0,
          // 宝箱信息
          chest: chestInfo.chestTriggered ? {
            triggered: true,
            tier: chestInfo.tier,
            rank: chestInfo.rank,
            chestTypePreview: chestTypePreview,  // 预览类型（可能与实际不同）
            note: "宝箱类型预览，实际类型在领取时根据槽位情况确定"
          } : {
            triggered: false,
          },
        },
        canClaim: playerTournament.status === TournamentStatus.SETTLED,  // 是否可以领取
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (error: any) {
      console.error("获取锦标赛结果失败:", error);
      return new Response(JSON.stringify({
        ok: false,
        error: error.message || "获取锦标赛结果失败"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }),
});

/**
 * 领取锦标赛奖励
 * 玩家主动触发，发放金币和积分奖励，返回宝箱信息供游戏模块生成宝箱
 */
http.route({
  path: "/claimTournamentRewards",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, tournamentId } = body;

      if (!uid || !tournamentId) {
        return new Response(JSON.stringify({
          ok: false,
          error: "缺少必要参数: uid, tournamentId"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 1. 获取玩家锦标赛记录
      const playerTournament = await ctx.runQuery(
        internal.dao.tournamentDao.getPlayerTournament,
        { uid, tournamentId }
      );

      if (!playerTournament) {
        return new Response(JSON.stringify({
          ok: false,
          error: "锦标赛记录不存在"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 导入 TournamentStatus
      const { TournamentStatus } = await import("./service/tournament/common");

      // 2. 检查状态
      if (playerTournament.status !== TournamentStatus.SETTLED) {
        return new Response(JSON.stringify({
          ok: false,
          error: playerTournament.status === TournamentStatus.COLLECTED
            ? "奖励已领取"
            : "奖励尚未结算"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 3. 发放积分奖励（通过 collectRewards）
      const { collectRewards } = await import("./service/tournament/common");
      await collectRewards(ctx, playerTournament); // This now only grants points

      // 4. 发放金币奖励（如果存在）
      const rewards = playerTournament.rewards || {};
      const coins = rewards.coins || 0;

      if (coins > 0) {
        const { RewardService } = await import("./service/reward/rewardService");
        await RewardService.grantRewards(ctx, {
          uid: uid,
          rewards: {
            coins: coins,
          },
          source: {
            source: "tournament_reward",
            sourceId: tournamentId,
          },
        });
      }

      // 5. 更新状态为已领取
      await ctx.runMutation(
        internal.dao.tournamentDao.markRewardsCollected,
        { playerTournamentId: playerTournament._id }
      );

      // 6. 返回奖励信息（包括金币和宝箱触发决策）
      const chestInfo = rewards.chestInfo || {};

      return new Response(JSON.stringify({
        ok: true,
        rewards: {
          coins: coins,
          gems: 0,
        },
        chestTriggered: chestInfo.chestTriggered || false,
        chestInfo: chestInfo.chestTriggered ? {
          chestTriggered: true,
          tier: chestInfo.tier,
          rank: chestInfo.rank,
          gameId: chestInfo.gameId,
          matchId: chestInfo.matchId,
        } : null,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (error: any) {
      console.error("领取锦标赛奖励失败:", error);
      return new Response(JSON.stringify({
        ok: false,
        error: error.message || "领取奖励失败"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }),
});

/**
 * 玩家经验值奖励发放端点
 * 供游戏模块调用
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
      const { PlayerLevelService } = await import("./service/player/playerLevelService");
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
 * 获取玩家等级信息端点
 */
http.route({
  path: "/getPlayerLevelInfo",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const uid = url.searchParams.get("uid");

      if (!uid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "缺少必要参数: uid",
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

      const { PlayerLevelService } = await import("./service/player/playerLevelService");
      const levelInfo = await PlayerLevelService.getPlayerLevelInfo(ctx, uid);

      if (!levelInfo) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "玩家不存在",
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          ...levelInfo,
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
      console.error("获取玩家等级信息失败:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "获取等级信息失败",
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
 */
http.route({
  path: "/calculateTaskExp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { taskType, taskDifficulty, taskRewardValue } = body;

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

      const { calculateTaskExp } = await import("./service/player/calculation/taskExpCalculation");
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
 */
http.route({
  path: "/calculateTournamentExp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { rank, totalParticipants, tier } = body;

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

      const { calculateTournamentExp } = await import("./service/player/calculation/tournamentExpCalculation");
      const exp = calculateTournamentExp(rank, totalParticipants, tier || "bronze");

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
 */
http.route({
  path: "/calculateActivityExp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { activityMultiplier } = body;

      const { calculateActivityExp } = await import("./service/player/calculation/activityExpCalculation");
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
 * 获取玩家能量端点
 */
http.route({
  path: "/getPlayerEnergy",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const uid = url.searchParams.get("uid");

      if (!uid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "缺少必要参数: uid",
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

      const { EnergyService } = await import("./service/resource/energyService");
      const energy = await EnergyService.getPlayerEnergy(ctx, uid);

      return new Response(
        JSON.stringify({
          success: true,
          energy: {
            current: energy.current,
            max: energy.max,
            lastRegenAt: energy.lastRegenAt,
          },
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
      console.error("获取玩家能量失败:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "获取能量失败",
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
 * 消耗能量端点
 */
http.route({
  path: "/consumeEnergy",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, amount } = body;

      if (!uid || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "缺少必要参数: uid, amount (必须大于0)",
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

      const { EnergyService } = await import("./service/resource/energyService");
      const success = await EnergyService.consumeEnergy(ctx, uid, amount);

      if (!success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "能量不足",
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

      return new Response(
        JSON.stringify({
          success: true,
          message: `成功消耗 ${amount} 能量`,
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
      console.error("消耗能量失败:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "消耗能量失败",
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
 * 添加能量端点（通过奖励系统）
 */
http.route({
  path: "/addEnergy",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { uid, amount, source, sourceId } = body;

      if (!uid || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "缺少必要参数: uid, amount (必须大于0)",
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

      const { EnergyService } = await import("./service/resource/energyService");
      const result = await EnergyService.addEnergy(ctx, {
        uid,
        amount,
        source: source || "reward",
        sourceId,
      });

      return new Response(
        JSON.stringify({
          success: result.ok,
          message: result.ok ? `成功添加 ${amount} 能量` : "添加能量失败",
        }),
        {
          status: result.ok ? 200 : 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error: any) {
      console.error("添加能量失败:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "添加能量失败",
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