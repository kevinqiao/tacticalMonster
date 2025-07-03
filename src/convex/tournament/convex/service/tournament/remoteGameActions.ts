import { v } from "convex/values";
import { action } from "../../_generated/server";

// 远程游戏服务器配置
const REMOTE_GAME_CONFIG = {
    // 游戏服务器API端点
    gameAPI: process.env.GAME_SERVER_API || "https://game-server.example.com/api/games",
    eventAPI: process.env.EVENT_SYNC_API || "https://event-sync.example.com/api/events",

    // 游戏类型映射
    gameTypeMapping: {
        "solitaire": "solitaire",
        "uno": "uno",
        "ludo": "ludo",
        "rummy": "rummy"
    },

    // 超时配置
    timeout: 30000, // 30秒
    retryAttempts: 3
};

/**
 * 创建远程游戏 - Action
 */
export const createRemoteGameAction = action({
    args: {
        matchId: v.string(),
        tournamentId: v.string(),
        uids: v.array(v.string()),
        gameType: v.string(),
        matchType: v.string(),
        timestamp: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // 构建游戏创建请求
            const gameRequest = {
                matchId: args.matchId,
                tournamentId: args.tournamentId,
                uids: args.uids,
                gameType: REMOTE_GAME_CONFIG.gameTypeMapping[args.gameType as keyof typeof REMOTE_GAME_CONFIG.gameTypeMapping] || args.gameType,
                matchType: args.matchType,
                timestamp: args.timestamp,
                config: {
                    timeout: REMOTE_GAME_CONFIG.timeout,
                    maxPlayers: args.uids.length,
                    gameMode: "tournament"
                }
            };

            // 发送请求到远程游戏服务器
            const gameResponse = await fetch(REMOTE_GAME_CONFIG.gameAPI, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GAME_SERVER_TOKEN || ""}`
                },
                body: JSON.stringify(gameRequest),
                signal: AbortSignal.timeout(REMOTE_GAME_CONFIG.timeout)
            });

            if (!gameResponse.ok) {
                throw new Error(`游戏服务器响应错误: ${gameResponse.status} ${gameResponse.statusText}`);
            }

            const gameResult = await gameResponse.json();

            // 验证响应
            if (!gameResult.gameId || !gameResult.serverUrl) {
                throw new Error("游戏服务器返回无效响应");
            }

            return {
                gameId: gameResult.gameId,
                serverUrl: gameResult.serverUrl,
                type: "remote",
                success: true
            };

        } catch (error) {
            console.error("创建远程游戏失败:", error);
            throw new Error(`创建远程游戏失败: ${error instanceof Error ? error.message : "未知错误"}`);
        }
    },
});

/**
 * 通知玩家事件 - Action
 */
export const notifyPlayersAction = action({
    args: {
        uids: v.array(v.string()),
        eventType: v.string(),
        eventData: v.any(),
        timestamp: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // 构建事件通知
            const events = args.uids.map(uid => ({
                uid,
                eventType: args.eventType,
                eventData: args.eventData,
                timestamp: args.timestamp
            }));

            // 发送到事件同步服务
            const eventResponse = await fetch(REMOTE_GAME_CONFIG.eventAPI, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.EVENT_SYNC_TOKEN || ""}`
                },
                body: JSON.stringify(events),
                signal: AbortSignal.timeout(10000) // 10秒超时
            });

            if (!eventResponse.ok) {
                console.warn(`事件通知失败: ${eventResponse.status} ${eventResponse.statusText}`);
            }

            return {
                success: true,
                notifiedPlayers: args.uids.length
            };

        } catch (error) {
            console.error("通知玩家失败:", error);
            // 不抛出错误，避免影响主要流程
            return {
                success: false,
                error: error instanceof Error ? error.message : "未知错误"
            };
        }
    },
}); 