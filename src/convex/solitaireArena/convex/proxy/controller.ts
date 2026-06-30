"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authedAction } from "../custom/session";
import { postCasualRunIngest, type CasualIngestParsed } from "../service/casualBridgeIngest";
import { buildCasualV2IngestPayload } from "../service/casualBotFill/computeBotFills";
import {
    isTerminalSolitaireStatus,
    parseCasualRunGameId,
    resolveCasualIngestScoreFromRow,
} from "../service/casualGameLifecycle";
import {
    casualBridgeRequestHeaders,
    resolveCasualBridgeEnv,
    resolvePlatformBridgeForCasualGameId,
    type PlatformBridge,
} from "../service/casualBridgeEnv";

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
        ...(parsed.weeklyLeagueSettle ? { weeklyLeagueSettle: parsed.weeklyLeagueSettle } : {}),
        ...(parsed.gameComplete === true ? { gameComplete: true as const } : {}),
        ...(parsed.nextGame ? { nextGame: parsed.nextGame } : {}),
        ...(seedScoreThreshold != null ? { seedScoreThreshold } : {}),
        ...(success != null ? { success } : {}),
    };
}

/** casual `/internal/casual-run-ingest` 成功后可选载荷 */
function casualTableSummaryFromParsed(v: unknown):
    | {
          maxPlayers: number;
          rows: Array<{
              rank: number;
              score?: number;
              rowState?: "scored" | "playing" | "matching";
              displayLabel: string;
              isYou: boolean;
              isBot?: boolean;
          }>;
          isBoardStable?: boolean;
      }
    | undefined {
    if (!v || typeof v !== "object") return undefined;
    const o = v as Record<string, unknown>;
    if (typeof o.maxPlayers !== "number" || !Array.isArray(o.rows)) return undefined;
    const rows: Array<{
        rank: number;
        score?: number;
        rowState?: "scored" | "playing" | "matching";
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
        if (r.rowState === "matching") {
            rows.push({
                rank: r.rank,
                rowState: "matching",
                displayLabel: r.displayLabel,
                isYou: r.isYou,
                ...(r.isBot === true ? { isBot: true as const } : {}),
            });
            continue;
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
    return {
        maxPlayers: o.maxPlayers,
        rows,
        ...(typeof o.isBoardStable === "boolean" ? { isBoardStable: o.isBoardStable } : {}),
    };
}

type CasualFindMatchResult = {
    ok?: boolean;
    match?: {
        gameId?: string;
        seed?: string;
        seedScoreThreshold?: number;
        replayEpoch?: number;
    };
    error?: string;
};

function shouldRebuildCasualArenaGame(
    existing: { status: number; replayEpoch?: number },
    match: { replayEpoch?: number } | undefined
): boolean {
    if (!match) return false;
    const platformEpoch = match.replayEpoch ?? 0;
    const storedEpoch = existing.replayEpoch ?? 0;
    if (platformEpoch !== storedEpoch) return true;
    return isTerminalSolitaireStatus(Number(existing.status));
}

async function resolveBridgeForCasualGameId(
    gameId: string,
    platformBridge?: PlatformBridge
): Promise<PlatformBridge> {
    if (platformBridge) return platformBridge;
    if (gameId.startsWith("game_")) {
        return resolvePlatformBridgeForCasualGameId(gameId);
    }
    return "casual";
}

async function fetchCasualMatchByGame(
    gameId: string,
    options?: { skipRecordSeed?: boolean; platformBridge?: PlatformBridge }
): Promise<CasualFindMatchResult> {
    const bridgeEnv = resolveCasualBridgeEnv(options?.platformBridge ?? "casual");
    const matchURL = `${bridgeEnv.origin}/internal/find-match-by-game`;
    let response: Response;
    try {
        response = await fetch(matchURL, {
            method: "POST",
            headers: casualBridgeRequestHeaders(bridgeEnv),
            body: JSON.stringify({
                gameId,
                ...(options?.skipRecordSeed ? { skipRecordSeed: true } : {}),
            }),
        });
    } catch (e) {
        console.error("[solitaire] find-match-by-game fetch failed", e);
        return { ok: false, error: "casual_unreachable" };
    }
    try {
        const text = await response.text();
        if (!text) return { ok: false, error: `casual_find_${response.status}` };
        return JSON.parse(text) as CasualFindMatchResult;
    } catch {
        return { ok: false, error: `casual_find_${response.status}` };
    }
}

export const loadGame = action({
    args: {
        gameId: v.string(),
        /** 休闲再战：平台 `startCasualRunReplay` 后须清游戏档再按原 seed 重建 */
        resetCasualRun: v.optional(v.literal(true)),
        platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
    },
    handler: async (ctx, { gameId, resetCasualRun, platformBridge }): Promise<any> => {
        const bridge = await resolveBridgeForCasualGameId(gameId, platformBridge);
        const res: { ok: boolean; game?: any; events?: any; error?: string; seedScoreThreshold?: number } = { ok: false };

        let recreate = resetCasualRun === true;
        if (!recreate && gameId.startsWith("game_")) {
            let existing = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
                gameId,
            });
            if (existing) {
                const meta = await fetchCasualMatchByGame(gameId, {
                    skipRecordSeed: true,
                    platformBridge: bridge,
                });
                if (!meta.ok) {
                    return { ok: false, error: meta.error ?? "casual_find_failed" };
                }
                if (shouldRebuildCasualArenaGame(existing, meta.match)) {
                    recreate = true;
                } else {
                    if (existing.dueTime == null) {
                        await ctx.runMutation(internal.service.gameManager.ensureCasualTimeoutScheduled, {
                            gameId,
                        });
                        const healed = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
                            gameId,
                        });
                        if (healed) {
                            existing = healed;
                        }
                    }
                    res.ok = true;
                    res.game = existing;
                    const threshold = meta.match?.seedScoreThreshold;
                    if (typeof threshold === "number" && Number.isFinite(threshold)) {
                        res.seedScoreThreshold = threshold;
                    }
                    return res;
                }
            }
        } else if (!recreate) {
            const existing = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, {
                gameId,
            });
            if (existing) {
                res.ok = true;
                res.game = existing;
                if (gameId.startsWith("game_")) {
                    const meta = await fetchCasualMatchByGame(gameId, {
                        skipRecordSeed: true,
                        platformBridge: bridge,
                    });
                    const threshold = meta.match?.seedScoreThreshold;
                    if (typeof threshold === "number" && Number.isFinite(threshold)) {
                        res.seedScoreThreshold = threshold;
                    }
                }
                return res;
            }
        }

        if (recreate && gameId.startsWith("game_")) {
            await ctx.runMutation(internal.service.gameManager.deleteCasualGameForReplay, { gameId });
        }

        const createArgs: { seed?: string; gameId: string; replayEpoch?: number } = { gameId };
        let seedScoreThreshold: number | undefined;

        if (gameId.startsWith("game_")) {
            const matchGameResult = await fetchCasualMatchByGame(gameId, { platformBridge: bridge });
            if (!matchGameResult.ok || !matchGameResult.match) {
                return {
                    ok: false,
                    error: matchGameResult.error ?? "casual_find_failed",
                };
            }
            const data = matchGameResult.match;
            const rawSeed = data?.seed ?? data?.gameId;
            if (typeof rawSeed === "string") {
                createArgs.seed = rawSeed;
            }
            if (typeof data?.seedScoreThreshold === "number" && Number.isFinite(data.seedScoreThreshold)) {
                seedScoreThreshold = data.seedScoreThreshold;
            }
            if (typeof data?.replayEpoch === "number" && Number.isFinite(data.replayEpoch)) {
                createArgs.replayEpoch = data.replayEpoch;
            }
        }

        let gameResult: { ok: boolean; data?: unknown; events?: unknown; error?: string };
        try {
            gameResult = await ctx.runMutation(internal.service.gameManager.createGame, createArgs);
        } catch (err) {
            console.error("[solitaire] loadGame createGame mutation threw", gameId, err);
            return { ok: false, error: "create_failed" };
        }
        if (gameResult?.ok) {
            res.ok = true;
            res.game = gameResult.data;
            res.events = gameResult.events;
            if (seedScoreThreshold != null) {
                res.seedScoreThreshold = seedScoreThreshold;
            }
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
    args: {
        gameId: v.string(),
        platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
        token: v.optional(v.string()),
    },
    handler: async (ctx, { gameId, platformBridge }) => {
        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const uid = ctx.uid;
        const parsedId = parseCasualRunGameId(gameId);
        if (!parsedId || parsedId.uid !== uid) {
            console.warn("[solitaire] submitCasualPlatformRun forbidden", {
                gameId,
                tokenUid: uid,
                parsedUid: parsedId?.uid ?? null,
            });
            return { ok: false as const, error: "forbidden" };
        }

        const game = await ctx.runMutation(internal.service.gameManager.loadGameRowAfterHeal, { gameId });
        if (!game) {
            return { ok: false as const, error: "no_game" };
        }

        const status = Number((game as { status?: number }).status);
        if (!isTerminalSolitaireStatus(status)) {
            return { ok: false as const, error: "not_terminal" };
        }

        const score = resolveCasualIngestScoreFromRow(game as { score?: number; playStartedAt?: number });

        const bridge = await resolveBridgeForCasualGameId(gameId, platformBridge);

        const built = await buildCasualV2IngestPayload({ ctx, uid, matchGameId: gameId, score, platformBridge: bridge });
        if (!built.ok) {
            return { ok: false as const, error: built.error };
        }

        const ingest = await postCasualRunIngest({ ...built.payload, platformBridge: bridge });
        if (!ingest.ok) {
            return { ok: false as const, error: ingest.error };
        }

        await ctx.runMutation(internal.service.casualGameLifecycle.cancelCasualTimeoutJob, { gameId });

        console.log("[solitaire] casual-run-ingest v2", {
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
    args: {
        gameId: v.string(),
        platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
        token: v.optional(v.string()),
    },
    handler: async (ctx, { gameId, platformBridge }) => {
        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const uid = ctx.uid;
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

        const bridge = await resolveBridgeForCasualGameId(gameId, platformBridge);

        const built = await buildCasualV2IngestPayload({
            ctx,
            uid: settled.uid,
            matchGameId: settled.gameId,
            score: settled.score,
            platformBridge: bridge,
        });
        if (!built.ok) {
            return { ok: false as const, error: built.error };
        }

        const ingest = await postCasualRunIngest({ ...built.payload, platformBridge: bridge });
        if (!ingest.ok) {
            return { ok: false as const, error: ingest.error };
        }

        console.log("[solitaire] forceEndCasualPlatformRun", { gameId, deduped: ingest.parsed.deduped });
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
    args: {
        gameId: v.string(),
        platformBridge: v.optional(v.union(v.literal("portal"), v.literal("casual"))),
    },
    handler: async (ctx, { gameId, platformBridge }) => {
        const bridgeEnv = resolveCasualBridgeEnv(
            await resolveBridgeForCasualGameId(gameId, platformBridge)
        );

        if (!gameId.startsWith("game_")) {
            return { ok: false as const, error: "not_casual_run_game_id" };
        }

        const uid = ctx.uid;

        const url = `${bridgeEnv.origin}/internal/casual-replay-authorize`;
        let res: Response;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: casualBridgeRequestHeaders(bridgeEnv),
                body: JSON.stringify({ uid, matchGameId: gameId }),
            });
        } catch (e) {
            console.error("[solitaire] casual replay authorize failed", e);
            return { ok: false as const, error: "casual_unreachable" };
        }

        let parsed: { ok?: boolean; error?: string; replayEpoch?: number; gameId?: string } = {};
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
            ...(typeof parsed.gameId === "string" ? { gameId: parsed.gameId } : {}),
        };
    },
});
