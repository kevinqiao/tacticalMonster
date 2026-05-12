"use node";

import { v } from "convex/values";
import jwt from "jsonwebtoken";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { resolveCasualBridgeEnv } from "../service/casualBridgeEnv";
import { SoloGameStatus } from "../types/SoloTypes";

const tournament_url = "https://beloved-mouse-699.convex.site";

/** 须与 casualPlatform JWT_ACCESS_SECRET 一致 */
function jwtAccessSecret(): string {
    return process.env.JWT_ACCESS_SECRET ?? "12222222";
}

function isTerminalSolitaire(status: number): boolean {
    return status === SoloGameStatus.COMPLETED || status === SoloGameStatus.CANCELLED;
}

export const loadGame = action({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }): Promise<any> => {
        const res: { ok: boolean; game?: any; events?: any; error?: string } = { ok: false };
        const existing = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
        if (existing) {
            res.ok = true;
            res.game = existing;
            return res;
        }

        const createArgs: { seed?: string; gameId: string } = { gameId };

        if (gameId.startsWith("game_")) {
            const { origin: casualOrigin, secret: bridge } = resolveCasualBridgeEnv();
            const matchURL = `${casualOrigin}/internal/find-match-by-game`;
            let response: Response;
            try {
                response = await fetch(matchURL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Casual-Bridge-Secret": bridge,
                    },
                    body: JSON.stringify({ gameId }),
                });
            } catch (e) {
                console.error("[solitaire] find-match-by-game fetch failed", e);
                return { ok: false, error: "casual_unreachable" };
            }
            let matchGameResult: {
                ok?: boolean;
                match?: { gameId?: string; seed?: string };
                error?: string;
            } = {};
            try {
                const text = await response.text();
                if (text) matchGameResult = JSON.parse(text) as typeof matchGameResult;
            } catch {
                matchGameResult = {};
            }
            if (!response.ok || !matchGameResult.ok || !matchGameResult.match) {
                return {
                    ok: false,
                    error: matchGameResult.error ?? `casual_find_${response.status}`,
                };
            }
            const data = matchGameResult.match;
            const rawSeed = data?.seed ?? data?.gameId;
            if (typeof rawSeed === "string") {
                createArgs.seed = rawSeed;
            }
        }

        const gameResult = await ctx.runMutation(internal.service.gameManager.createGame, createArgs);
        if (gameResult && gameResult.ok) {
            res.ok = true;
            res.game = gameResult.data;
            res.events = gameResult.events;
        } else {
            res.ok = false;
            res.error = "create_failed";
        }
        return res;
    },
});
export const submitScore = action({
    args: { gameId: v.string(), score: v.number() },
    handler: async (_ctx, { gameId, score }): Promise<any> => {
        /** 休闲 run 对局 ID：禁止用客户端分数走锦标赛 HTTP，须 `submitCasualPlatformRun` + casual ingest */
        if (typeof gameId === "string" && gameId.startsWith("game_")) {
            return { ok: false as const, error: "casual_run_forbidden_client_submit" };
        }
        console.log("submitScore", gameId, score);
        const submitURL = `${tournament_url}/submitGameScore`;
        try {
            const response = await fetch(submitURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId, score }),
            });
            const text = await response.text();
            let parsed: { ok?: boolean } | null = null;
            if (text && text.trim().length > 0) {
                try {
                    parsed = JSON.parse(text) as { ok?: boolean };
                } catch {
                    console.warn(
                        "submitScore: upstream returned non-JSON",
                        response.status,
                        text.slice(0, 160)
                    );
                }
            }
            if (parsed && typeof parsed === "object" && "ok" in parsed) {
                console.log("submitScore res", parsed);
                return { ok: Boolean(parsed.ok), res: parsed };
            }
            return {
                ok: false as const,
                error: "upstream_not_json",
                status: response.status,
            };
        } catch (e) {
            console.error("submitScore fetch failed", e);
            return { ok: false as const, error: "fetch_failed" };
        }
    },
});

/**
 * 休闲锦标：从 DB 读终局分数，再 POST casual `/internal/casual-run-ingest`（服务端密钥）。
 */
export const submitCasualPlatformRun = action({
    args: { token: v.string(), gameId: v.string() },
    handler: async (ctx, { token, gameId }) => {
        const { origin: casualOrigin, secret: bridge } = resolveCasualBridgeEnv();

        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        let uid: string;
        try {
            const payload = jwt.verify(token, jwtAccessSecret());
            if (!payload || typeof payload !== "object" || !("uid" in payload)) {
                return { ok: false as const, error: "invalid_token" };
            }
            uid = String((payload as { uid: unknown }).uid);
        } catch {
            return { ok: false as const, error: "verify_failed" };
        }

        const game = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
        if (!game) {
            return { ok: false as const, error: "no_game" };
        }

        const status = Number((game as { status?: number }).status);
        if (!isTerminalSolitaire(status)) {
            return { ok: false as const, error: "not_terminal" };
        }

        const score = Math.max(0, Math.floor(Number((game as { score?: number }).score ?? 0)));

        const url = `${casualOrigin}/internal/casual-run-ingest`;
        let res: Response;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Casual-Bridge-Secret": bridge,
                },
                body: JSON.stringify({
                    uid,
                    matchGameId: gameId,
                    score,
                    gameKind: "solitaire",
                }),
            });
        } catch (e) {
            console.error("[solitaire] casual ingest fetch failed", e);
            return { ok: false as const, error: "casual_unreachable" };
        }

        let parsed: { ok?: boolean; error?: string } = {};
        try {
            const text = await res.text();
            if (text) parsed = JSON.parse(text) as { ok?: boolean; error?: string };
        } catch {
            parsed = {};
        }

        if (!res.ok || !parsed.ok) {
            return {
                ok: false as const,
                error: parsed.error ?? `casual_${res.status}`,
            };
        }

        return { ok: true as const };
    },
});
