/**
 * 对局结束后通知 Tournament 模块更新 player_matches / matches（HTTP /submitScore）
 * 与 proxy/controller.submitScore 行为一致，供服务端在结算路径自动调用
 */
import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { getTournamentUrl, TOURNAMENT_CONFIG } from "../../config/tournamentConfig";

export const submitMatchScoreToTournament = internalAction({
    args: {
        gameId: v.string(),
        finalScore: v.number(),
        isFirstClear: v.optional(v.boolean()),
    },
    handler: async (_ctx, args) => {
        const url = getTournamentUrl(TOURNAMENT_CONFIG.ENDPOINTS.SUBMIT_MATCH_SCORE);
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gameId: args.gameId,
                    finalScore: args.finalScore,
                    isFirstClear: args.isFirstClear === true,
                }),
            });
            const res = (await response.json()) as { ok?: boolean; error?: string };
            if (!response.ok || res?.ok !== true) {
                console.error("[submitMatchScoreToTournament] tournament rejected", {
                    url,
                    gameId: args.gameId,
                    status: response.status,
                    res,
                });
                return { ok: false as const, error: res?.error ?? response.statusText };
            }
            console.log("[submitMatchScoreToTournament] ok", { gameId: args.gameId, finalScore: args.finalScore });
            return { ok: true as const };
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[submitMatchScoreToTournament] fetch failed", { url, gameId: args.gameId, msg });
            return { ok: false as const, error: msg };
        }
    },
});
