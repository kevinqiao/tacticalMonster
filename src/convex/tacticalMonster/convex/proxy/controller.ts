import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { getTournamentUrl, TOURNAMENT_CONFIG } from "../config/tournamentConfig";

export const loadGame = action({
    args: {
        gameId: v.string(),
        mapId: v.optional(v.string()),
        playerUid: v.optional(v.string()),
    },
    handler: async (ctx, { gameId, mapId, playerUid }): Promise<any> => {
        const res: { ok: boolean; game?: any; events?: any } = { ok: false };
        // 类型断言：类型文件会在 convex dev 重新生成后自动更新
        let game = await ctx.runQuery((internal as any).service.game.gameService.findGame, { gameId });

        if (!game) {
            // 延迟创建策略：游戏实例不存在时，按需创建
            // 从 tournament 获取 match 信息
            let createArgs: {
                mapId: string;
                playerUid: string;
                gameId: string;
                seed?: string;
            } | null = null;

            if (mapId && playerUid) {
                // 直接创建单人游戏
                createArgs = {
                    mapId,
                    playerUid,
                    gameId,
                };
            } else {
                // 从 tournament 获取 match 信息
                const matchURL = getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.FIND_MATCH_GAME);
                const response = await fetch(matchURL, {
                    method: "POST",
                    body: JSON.stringify({ gameId }),
                });
                const matchGameResult = await response.json();

                if (matchGameResult.ok) {
                    const data = matchGameResult.match;
                    const rawSeed = data?.seed ?? data?.gameId;

                    // 假设第一个玩家是玩家，其他是 AI 控制
                    const player = data?.players?.[0];
                    if (player) {
                        createArgs = {
                            mapId: data?.mapId ?? "1",
                            playerUid: player.uid,
                            gameId,
                        };

                        if (typeof rawSeed === "string") {
                            createArgs.seed = rawSeed;
                        }
                    }
                }
            }

            if (createArgs) {
                const gameResult = await ctx.runMutation(
                    (internal as any).service.game.gameService.createGame,
                    createArgs
                );

                if (gameResult && gameResult.ok) {
                    res.ok = true;
                    res.game = gameResult.data;
                    // ✅ 传递 phaseChanges 给前端
                    if (gameResult.phaseChanges) {
                        (res as any).phaseChanges = gameResult.phaseChanges;
                    }
                }
            }
        } else {
            res.ok = true;
            res.game = game;
        }

        return res;
    },
});

export const submitScore = action({
    args: {
        gameId: v.string(),
        score: v.number(),
        isFirstClear: v.optional(v.boolean()),
    },
    handler: async (ctx, { gameId, score, isFirstClear }): Promise<any> => {
        console.log("submitScore", gameId, score, isFirstClear);
        const submitURL = getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.SUBMIT_MATCH_SCORE);
        const response = await fetch(submitURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                gameId,
                finalScore: score,
                isFirstClear: isFirstClear === true,
            }),
        });
        const res = await response.json();
        console.log("submitScore res", res);
        return { ok: res.ok ? true : false, res };
    },
});


