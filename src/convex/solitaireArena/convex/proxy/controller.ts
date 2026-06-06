"use node";

import { v } from "convex/values";
import jwt from "jsonwebtoken";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { postCasualRunIngest, type CasualIngestParsed } from "../service/casualBridgeIngest";
import {
    isTerminalSolitaireStatus,
    parseCasualRunGameId,
    resolveCasualIngestScoreFromRow,
} from "../service/casualGameLifecycle";
import { resolveCasualBridgeEnv } from "../service/casualBridgeEnv";

const tournament_url = "https://beloved-mouse-699.convex.site";

/** 须与 casualPlatform JWT_ACCESS_SECRET 一致 */
function jwtAccessSecret(): string {
    return process.env.JWT_ACCESS_SECRET ?? "12222222";
}

function verifyCasualRunToken(token: string): { ok: true; uid: string } | { ok: false; error: string } {
    try {
        const payload = jwt.verify(token, jwtAccessSecret());
        if (!payload || typeof payload !== "object" || !("uid" in payload)) {
            return { ok: false, error: "invalid_token" };
        }
        return { ok: true, uid: String((payload as { uid: unknown }).uid) };
    } catch {
        return { ok: false, error: "verify_failed" };
    }
}

function mapCasualIngestClientResponse(parsed: CasualIngestParsed) {
    const tableSummary = casualTableSummaryFromParsed(parsed.tableSummary);
    const pendingOthers = parsed.pendingOthers === true;
    const replayOffered = parsed.replayOffered === true;
    const replayTokenCount =
        typeof parsed.replayTokenCount === "number" ? parsed.replayTokenCount : undefined;
    const canReplay = parsed.canReplay === true;
    const replayWindowEndsAt =
        typeof parsed.replayWindowEndsAt === "number" ? parsed.replayWindowEndsAt : undefined;
    return {
        ok: true as const,
        ...(tableSummary ? { tableSummary } : {}),
        ...(pendingOthers ? { pendingOthers: true as const } : {}),
        ...(replayOffered ? { replayOffered: true as const } : {}),
        ...(replayTokenCount != null ? { replayTokenCount } : {}),
        ...(canReplay ? { canReplay: true as const } : {}),
        ...(replayWindowEndsAt != null ? { replayWindowEndsAt } : {}),
    };
}

/** casual `/internal/casual-run-ingest` 成功后可选载荷 */
function casualTableSummaryFromParsed(v: unknown):
    | {
          maxPlayers: number;
          rows: Array<{
              rank: number;
              score?: number;
              rowState?: "scored" | "playing";
              displayLabel: string;
              isYou: boolean;
              isBot?: boolean;
          }>;
      }
    | undefined {
    if (!v || typeof v !== "object") return undefined;
    const o = v as Record<string, unknown>;
    if (typeof o.maxPlayers !== "number" || !Array.isArray(o.rows)) return undefined;
    const rows: Array<{
        rank: number;
        score?: number;
        rowState?: "scored" | "playing";
        displayLabel: string;
        isYou: boolean;
        isBot?: boolean;
    }> = [];
    for (const item of o.rows) {
        if (!item || typeof item !== "object") return undefined;
        const r = item as Record<string, unknown>;
        if (typeof r.rank !== "number" || typeof r.displayLabel !== "string" || typeof r.isYou !== "boolean") {
            return undefined;
        }
        const rowState =
            r.rowState === "playing" || r.rowState === "scored" ? r.rowState : undefined;
        if (rowState === "playing") {
            rows.push({
                rank: r.rank,
                rowState: "playing",
                displayLabel: r.displayLabel,
                isYou: r.isYou,
                ...(r.isBot === true ? { isBot: true as const } : {}),
            });
            continue;
        }
        if (typeof r.score !== "number") return undefined;
        rows.push({
            rank: r.rank,
            score: r.score,
            rowState: rowState ?? "scored",
            displayLabel: r.displayLabel,
            isYou: r.isYou,
            ...(r.isBot === true ? { isBot: true as const } : {}),
        });
    }
    if (rows.length === 0) return undefined;
    return { maxPlayers: o.maxPlayers, rows };
}

export const loadGame = action({
    args: {
        gameId: v.string(),
        /** 休闲再战：平台 `startCasualRunReplay` 后须清游戏档再按原 seed 重建 */
        resetCasualRun: v.optional(v.literal(true)),
    },
    handler: async (ctx, { gameId, resetCasualRun }): Promise<any> => {
        const res: { ok: boolean; game?: any; events?: any; error?: string } = { ok: false };
        if (resetCasualRun === true && gameId.startsWith("game_")) {
            await ctx.runMutation(internal.service.gameManager.deleteCasualGameForReplay, { gameId });
        } else {
            const existing = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
            if (existing) {
                res.ok = true;
                res.game = existing;
                return res;
            }
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
            const fresh = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
            res.ok = true;
            res.game = fresh ?? gameResult.data;
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
        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const auth = verifyCasualRunToken(token);
        if (!auth.ok) {
            return { ok: false as const, error: auth.error };
        }
        const uid = auth.uid;
        const parsedId = parseCasualRunGameId(gameId);
        if (!parsedId || parsedId.uid !== uid) {
            console.warn("[solitaire] submitCasualPlatformRun forbidden", {
                gameId,
                tokenUid: uid,
                parsedUid: parsedId?.uid ?? null,
            });
            return { ok: false as const, error: "forbidden" };
        }

        const game = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
        if (!game) {
            return { ok: false as const, error: "no_game" };
        }

        const status = Number((game as { status?: number }).status);
        if (!isTerminalSolitaireStatus(status)) {
            return { ok: false as const, error: "not_terminal" };
        }

        const score = resolveCasualIngestScoreFromRow(game as { score?: number; playStartedAt?: number });
        const ingest = await postCasualRunIngest({ uid, matchGameId: gameId, score });
        if (!ingest.ok) {
            return { ok: false as const, error: ingest.error };
        }

        await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

        console.log("[solitaire] casual-run-ingest", {
            gameId,
            deduped: ingest.parsed.deduped,
            pendingOthers: ingest.parsed.pendingOthers,
        });
        return mapCasualIngestClientResponse(ingest.parsed);
    },
});

/**
 * 玩家强行结束：取消 timeout scheduler、终局写 game 表、ingest casual。
 */
export const forceEndCasualPlatformRun = action({
    args: { token: v.string(), gameId: v.string() },
    handler: async (ctx, { token, gameId }) => {
        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const auth = verifyCasualRunToken(token);
        if (!auth.ok) {
            return { ok: false as const, error: auth.error };
        }
        const uid = auth.uid;
        const parsedId = parseCasualRunGameId(gameId);
        if (!parsedId || parsedId.uid !== uid) {
            console.warn("[solitaire] forceEndCasualPlatformRun forbidden", {
                gameId,
                tokenUid: uid,
                parsedUid: parsedId?.uid ?? null,
            });
            return { ok: false as const, error: "forbidden" };
        }

        await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

        const settled = await ctx.runMutation(
            internal.service.casualGameLifecycle.settleCasualGameFromTable,
            { gameId, uid }
        );
        if (!settled.ok || !settled.shouldIngest) {
            const err =
                settled.ok === false && "error" in settled
                    ? settled.error
                    : "reason" in settled && settled.reason === "gone"
                      ? "no_game"
                      : "settle_failed";
            return { ok: false as const, error: err };
        }

        const ingest = await postCasualRunIngest({
            uid: settled.uid,
            matchGameId: settled.gameId,
            score: settled.score,
        });
        if (!ingest.ok) {
            return { ok: false as const, error: ingest.error };
        }

        console.log("[solitaire] forceEndCasualPlatformRun", { gameId, deduped: ingest.parsed.deduped });
        return mapCasualIngestClientResponse(ingest.parsed);
    },
});

/**
 * 休闲再战：authorize → 清档 → 同 gameId 重建。
 */
export const replayCasualRun = action({
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

        const url = `${casualOrigin}/internal/casual-replay-authorize`;
        let res: Response;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Casual-Bridge-Secret": bridge,
                },
                body: JSON.stringify({ uid, matchGameId: gameId }),
            });
        } catch (e) {
            console.error("[solitaire] casual replay authorize failed", e);
            return { ok: false as const, error: "casual_unreachable" };
        }

        let parsed: { ok?: boolean; error?: string; replayEpoch?: number } = {};
        try {
            const text = await res.text();
            if (text) parsed = JSON.parse(text) as typeof parsed;
        } catch {
            parsed = {};
        }

        if (!res.ok || !parsed.ok) {
            return { ok: false as const, error: parsed.error ?? `casual_${res.status}` };
        }

        return {
            ok: true as const,
            replayEpoch: parsed.replayEpoch,
        };
    },
});
