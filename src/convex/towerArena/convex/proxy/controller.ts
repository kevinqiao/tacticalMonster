"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authedAction } from "../custom/session";
import { postCasualRunIngest, type CasualIngestParsed } from "../service/casualBridgeIngest";
import { buildCasualV2IngestPayload } from "../service/casualBotFill/computeBotFills";
import {
    isTerminalTowerStatus,
    parseCasualRunGameId,
    resolveCasualIngestScoreFromTowerRow,
} from "../service/casualGameLifecycle";
import { resolveCasualBridgeEnv } from "../service/casualBridgeEnv";
import { generateTowerSeedFromId } from "../shared/towerSeedCatalog";
import { casualTableSummaryFromParsed } from "../../../shared/casualIngestTableSummaryClient";

const tournament_url = "https://beloved-mouse-699.convex.site";

function mapCasualIngestClientResponse(
    parsed: CasualIngestParsed,
    extra?: { seedScoreThreshold?: number; score?: number }
) {
    const tableSummary = casualTableSummaryFromParsed(parsed.tableSummary);
    const pendingOthers = parsed.pendingOthers === true;
    const seedScoreThreshold =
        typeof parsed.seedScoreThreshold === "number" && Number.isFinite(parsed.seedScoreThreshold)
            ? parsed.seedScoreThreshold
            : typeof extra?.seedScoreThreshold === "number" && Number.isFinite(extra.seedScoreThreshold)
              ? extra.seedScoreThreshold
              : undefined;
    const success =
        typeof parsed.success === "boolean"
            ? parsed.success
            : seedScoreThreshold != null && typeof extra?.score === "number"
              ? extra.score >= seedScoreThreshold
              : undefined;
    return {
        ok: true as const,
        ...(tableSummary ? { tableSummary } : {}),
        ...(pendingOthers ? { pendingOthers: true as const } : {}),
        ...(parsed.deduped === true ? { deduped: true as const } : {}),
        ...(parsed.finalized === true ? { finalized: true as const } : {}),
        ...(seedScoreThreshold != null ? { seedScoreThreshold } : {}),
        ...(success != null ? { success } : {}),
    };
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
                console.error("[tower] find-match-by-game fetch failed", e);
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

        let gameResult: { ok: boolean; data?: unknown; events?: unknown; error?: string };
        try {
            gameResult = await ctx.runMutation(internal.service.gameManager.createGame, createArgs);
        } catch (err) {
            console.error("[tower] loadGame createGame mutation threw", gameId, err);
            return { ok: false, error: "create_failed" };
        }
        if (gameResult?.ok) {
            const fresh = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
            res.ok = true;
            res.game = fresh ?? gameResult.data;
            res.events = gameResult.events;
        } else {
            res.ok = false;
            res.error = gameResult?.error ?? "create_failed";
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
 * 休闲锦标 v2：resolve 桌型 → 游戏服算 bot → POST casual ingest。
 */
export const submitCasualPlatformRun = authedAction({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const uid = ctx.uid;
        const parsedId = parseCasualRunGameId(gameId);
        if (!parsedId || parsedId.uid !== uid) {
            console.warn("[tower] submitCasualPlatformRun forbidden", {
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
        if (!isTerminalTowerStatus(status)) {
            return { ok: false as const, error: "not_terminal" };
        }

        const g = game as {
          score?: number;
          playStartedAt?: number;
          lives?: number;
          wavesCleared?: number;
          gold?: number;
          elapsedSimMs?: number;
          seedId?: string;
        };
        const score = resolveCasualIngestScoreFromTowerRow({
          lives: g.lives,
          wavesCleared: g.wavesCleared,
          gold: g.gold,
          elapsedSimMs: g.elapsedSimMs,
          seed: g.seedId ? generateTowerSeedFromId(g.seedId) : undefined,
          score: g.score,
          playStartedAt: g.playStartedAt,
        });

        const built = await buildCasualV2IngestPayload({ ctx, uid, matchGameId: gameId, score });
        if (!built.ok) {
            return { ok: false as const, error: built.error };
        }

        const ingest = await postCasualRunIngest(built.payload);
        if (!ingest.ok) {
            return { ok: false as const, error: ingest.error };
        }

        await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

        console.log("[tower] casual-run-ingest v2", {
            gameId,
            deduped: ingest.parsed.deduped,
            pendingOthers: ingest.parsed.pendingOthers,
        });
        return mapCasualIngestClientResponse(ingest.parsed, {
            seedScoreThreshold: built.payload.seedScoreThreshold,
            score: built.payload.score,
        });
    },
});

/**
 * 玩家强行结束：取消 timeout scheduler、终局写 game 表、ingest casual。
 */
export const forceEndCasualPlatformRun = authedAction({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const uid = ctx.uid;
        const parsedId = parseCasualRunGameId(gameId);
        if (!parsedId || parsedId.uid !== uid) {
            console.warn("[tower] forceEndCasualPlatformRun forbidden", {
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

        const built = await buildCasualV2IngestPayload({
            ctx,
            uid: settled.uid,
            matchGameId: settled.gameId,
            score: settled.score,
        });
        if (!built.ok) {
            return { ok: false as const, error: built.error };
        }

        const ingest = await postCasualRunIngest(built.payload);
        if (!ingest.ok) {
            return { ok: false as const, error: ingest.error };
        }

        console.log("[tower] forceEndCasualPlatformRun", { gameId, deduped: ingest.parsed.deduped });
        return mapCasualIngestClientResponse(ingest.parsed, {
            seedScoreThreshold: built.payload.seedScoreThreshold,
            score: built.payload.score,
        });
    },
});

/**
 * 休闲再战：authorize → 清档 → 同 gameId 重建。
 */
export const replayCasualRun = authedAction({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const { origin: casualOrigin, secret: bridge } = resolveCasualBridgeEnv();

        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const uid = ctx.uid;

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
            console.error("[tower] casual replay authorize failed", e);
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

