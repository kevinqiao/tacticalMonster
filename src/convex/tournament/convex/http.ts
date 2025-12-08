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
          grantResults: rewardDecision.grantResults,  // 金币发放结果
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

// Convex expects the router to be the default export of `convex/http.js`.
export default http;