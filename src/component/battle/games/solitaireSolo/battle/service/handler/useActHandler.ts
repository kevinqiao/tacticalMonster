import { SoloGameEngine } from "@/convex/solitaireArena/convex/service/SoloGameEngine";
import { useCasualPlatform } from "component/lobby/casual/service/useCasualPlatformManager";
import { useUserManager } from "host/service/UserManager";
import { usePlatformAuth } from "host/service/platformAuth/PlatformAuthProvider";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useConvex } from "convex/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../../../../../convex/solitaireArena/convex/_generated/api";
import { popCard } from "../../animation/effects/popCard";
import type { FlipGenericSession } from "../../animation/effects/flipGeneric";
import { startFlipGeneric } from "../../animation/effects/flipGeneric";
import { SOLO_ANIMATION_CONFIG } from "../../animation/animationConfig";
import { dealEffect } from "../../animation/effects/dealEffect";
import { PlayEffects } from "../../animation/PlayEffects";
import {
    ActionResult,
    ActMode,
    Card,
    GameInteractionPhase,
    SoloActionData,
    SoloCard,
    SoloGameState,
    SoloGameStatus,
    ZoneType,
} from "../../types/SoloTypes";
import { getCardCoord, syncCardStackZIndexFromGameState, soloCardZIndex } from "../../Utils";
import { useSoloGameManager } from "../GameManager";
import {
    buildSolitaireScoreReport,
    shouldOpenCasualTableSummaryAfterScoreReport,
    type CasualGameScoreReportUI,
} from "../../../../shared/casualGameScoreReportUI";
import type { CasualWatchContext } from "../../../../shared/casualAsyncTableSummaryUI";
import { buildCasualPlatformRunActionArgs } from "../../../../shared/casualPlatformActionArgs";
import { fetchCasualAsyncTableSummaryForGame } from "../../../../shared/fetchCasualAsyncTableSummary";
import {
    applyCasualTableSummaryFromQuery,
    type CasualAsyncTableSummaryUI,
    type ManualSettleConfirmExtras,
} from "../../../../shared/casualAsyncTableSummaryUI";
import type { WeeklyLeagueSettleUI } from "../../../../shared/casualWeeklyLeagueScoreUI";
import { useCasualTableSummaryPoll } from "../../../../shared/useCasualTableSummaryPoll";
import {
    queueTriathlonMidSessionAdvance,
    shouldDeferTriathlonTableSummaryForLeg,
    tryAdvanceTriathlonMidSession,
    type TriathlonMidSessionAdvanceHandler,
    type TriathlonPendingAdvance,
} from "../../../../shared/casualTriathlonSubmitFlow";
import type { TriathlonNextGame } from "component/lobby/casual/service/useCasualTriathlonSession";
import type { GameReport } from "../../types/SoloTypes";

type ServerProgress = { score?: number; moves?: number; gameStatus?: number };

type CasualRunSubmitOutcome =
    | {
          ok: true;
          /** finalize 直返时可能存在；partial 路径由 query 拉榜 */
          tableSummary?: CasualAsyncTableSummaryUI;
          pendingOthers?: boolean;
          weeklyLeagueSettle?: WeeklyLeagueSettleUI;
          /** solo_p75_challenge：目标分（P75）与是否成功 */
          seedScoreThreshold?: number;
          success?: boolean;
          triathlonScoreReportOnly?: boolean;
      }
    | { ok: false; error?: string };

/** 将 solitaire/casual 后端 error 码映射为结算弹窗可读文案 */
function casualSettleErrorMessage(error?: string): string {
    switch (error) {
        case "verify_failed":
        case "invalid_token":
            return "登录已失效，请退出对局后重新登录再试";
        case "forbidden":
            return "账号与对局不匹配，请从大厅重新进入本场";
        case "no_game":
            return "对局数据不存在，请重新进入本场";
        case "not_terminal":
            return "对局尚未结束，请稍后再试";
        case "unknown_match_game":
            return "未找到休闲场次记录，请从大厅重新开局";
        case "match_not_submittable":
            return "本场已不可提交成绩";
        case "unauthorized":
        case "casual_401":
            return "休闲平台鉴权失败，请确认部署环境配置";
        case "casual_unreachable":
        case "game_unreachable":
            return "休闲平台暂时不可达，请稍后重试";
        case "casual_run_forbidden_client_submit":
            return "结算通道异常，请重新登录后重试";
        case "missing_casual_auth":
            return "未登录，无法提交休闲场成绩";
        case "settle_failed":
            return "终局写入失败，请重试";
        default:
            if (error?.startsWith("casual_")) {
                return `休闲平台返回错误（${error}），请稍后重试`;
            }
            return error ? `结算失败（${error}），请重试` : "结算提交失败，请重试";
    }
}

function mergeServerProgress(gs: SoloGameState, p: ServerProgress) {
    if (typeof p.score === "number") gs.score = p.score;
    if (typeof p.moves === "number") gs.moves = p.moves;
    if (typeof p.gameStatus === "number") gs.status = p.gameStatus;
}

function mergeServerFaceOntoDomCard(dom: SoloCard | undefined, patch: SoloCard): SoloCard {
    return {
        ...(dom ?? patch),
        ...patch,
        ele: dom?.ele ?? patch.ele,
    };
}

function attachMovePlanEle(gameState: SoloGameState, movePlan: SoloCard[]): SoloCard[] {
    return movePlan.map((c) => {
        const dom = gameState.cards.find((gc) => gc.id === c.id);
        return { ...c, ele: dom?.ele } as SoloCard;
    });
}

function isTerminalSoloStatus(status: SoloGameStatus | number | undefined): boolean {
    const n = Number(status);
    return n === SoloGameStatus.COMPLETED || n === SoloGameStatus.CANCELLED;
}

const useActHandler = () => {
    const convex = useConvex();
    const { user } = useUserManager();
    const { platformReady } = usePlatformAuth();
    const {
        ruleManager,
        gameState,
        boardDimension,
        boardDimensionRef,
        setInteractionPhase,
        interactionPhase,
        config,
        casualTournamentId,
        onGameSubmit,
        onTriathlonNextGame,
        reloadCasualRun,
        saveUpdate,
    } = useSoloGameManager();

    const triathlonSessionActive = Boolean(onTriathlonNextGame);
    const casualPlatformBridge = casualTournamentId?.startsWith("portal_")
        ? ("portal" as const)
        : undefined;
    const casualPlatformAuthed =
        platformReady && isPlatformAuthed(user) && Boolean(user?.platformAccessToken);
    const casual = useCasualPlatform({ enabled: casualPlatformBridge !== "portal" });
    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
    const [postCasualScoreReportOpen, setPostCasualScoreReportOpen] = useState(false);
    const [postCasualScoreReport, setPostCasualScoreReport] = useState<CasualGameScoreReportUI | null>(null);
    const [postCasualSummaryOpen, setPostCasualSummaryOpen] = useState(false);
    const [postCasualTableSummary, setPostCasualTableSummary] = useState<CasualAsyncTableSummaryUI | null>(
        null
    );
    const [postCasualWeeklyLeagueSettle, setPostCasualWeeklyLeagueSettle] =
        useState<WeeklyLeagueSettleUI | null>(null);
    const [postCasualWaitingForPeers, setPostCasualWaitingForPeers] = useState(false);
    const [postCasualCanReplay, setPostCasualCanReplay] = useState(false);
    const [postCasualReplayOffered, setPostCasualReplayOffered] = useState(false);
    const [postCasualReplayTokenCount, setPostCasualReplayTokenCount] = useState(0);
    const [postCasualReplayWindowEndsAt, setPostCasualReplayWindowEndsAt] = useState<number | undefined>(
        undefined
    );
    const [casualReplayBusy, setCasualReplayBusy] = useState(false);
    const [triathlonDeferTableSummary, setTriathlonDeferTableSummary] = useState(false);
    const [watchTarget, setWatchTarget] = useState<CasualWatchContext | null>(null);
    const [watchTargetLabel, setWatchTargetLabel] = useState("");
    const casualRunSubmittedRef = useRef(false);
    const pendingTriathlonAdvanceRef = useRef<TriathlonPendingAdvance | null>(null);
    const settleInFlightRef = useRef(false);
    const gameStateRef = useRef<SoloGameState | null>(null);
    const interactionPhaseRef = useRef<GameInteractionPhase>(GameInteractionPhase.idle);

    const fetchTableSummaryForGame = useCallback(
        (matchGameId: string) =>
            fetchCasualAsyncTableSummaryForGame({
                matchGameId,
                platformBridge: casualPlatformBridge ?? "casual",
            }),
        [casualPlatformBridge]
    );

    useCasualTableSummaryPoll({
        open:
            (postCasualSummaryOpen || postCasualScoreReportOpen) && !triathlonDeferTableSummary,
        summary: postCasualTableSummary,
        matchGameId:
            typeof gameState?.gameId === "string" && gameState.gameId.startsWith("game_")
                ? gameState.gameId
                : undefined,
        fetchSummary: fetchTableSummaryForGame,
        onUpdate: (next) => {
            applyCasualTableSummaryFromQuery(next, {
                setTableSummary: setPostCasualTableSummary,
                setReplayOffered: setPostCasualReplayOffered,
                setReplayTokenCount: setPostCasualReplayTokenCount,
                setCanReplay: setPostCasualCanReplay,
                setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
            });
        },
    });

    useEffect(() => {
        gameStateRef.current = gameState ?? null;
    }, [gameState]);

    useEffect(() => {
        interactionPhaseRef.current = interactionPhase;
    }, [interactionPhase]);

    useEffect(() => {
        casualRunSubmittedRef.current = false;
        pendingTriathlonAdvanceRef.current = null;
        setTriathlonDeferTableSummary(false);
        setSettleConfirmOpen(false);
        setPostCasualScoreReportOpen(false);
        setPostCasualScoreReport(null);
        setPostCasualSummaryOpen(false);
        setPostCasualTableSummary(null);
        setPostCasualWaitingForPeers(false);
        setPostCasualCanReplay(false);
        setPostCasualReplayWindowEndsAt(undefined);
        setCasualReplayBusy(false);
        setWatchTarget(null);
        setWatchTargetLabel("");
    }, [gameState?.gameId]);

    const loadSolitaireScoreReport = useCallback(
        async (gameId: string, fallbackScore: number): Promise<CasualGameScoreReportUI> => {
            try {
                const res = (await convex.query(api.service.gameManager.findReport, { gameId })) as {
                    ok?: boolean;
                    data?: GameReport;
                };
                if (res?.ok && res.data) {
                    return buildSolitaireScoreReport(res.data);
                }
            } catch (e) {
                console.warn("[Solitaire] findReport", e);
            }
            return {
                gameLabel: "Solitaire",
                lines: [{ label: "本局得分", value: fallbackScore }],
                totalScore: fallbackScore,
            };
        },
        [convex]
    );

    const beginCasualPostSettleFlow = useCallback(
        async (
            gameId: string,
            fallbackScore: number,
            settle: {
                tableSummary?: CasualAsyncTableSummaryUI;
                pendingOthers?: boolean;
                weeklyLeagueSettle?: WeeklyLeagueSettleUI;
                seedScoreThreshold?: number;
                success?: boolean;
                deferTriathlonTableSummary?: boolean;
            }
        ) => {
            const report = await loadSolitaireScoreReport(gameId, fallbackScore);
            if (typeof settle.seedScoreThreshold === "number") {
                report.challenge = {
                    targetScore: settle.seedScoreThreshold,
                    achievedScore: report.totalScore,
                    success: Boolean(settle.success),
                };
            }
            const deferTableSummary =
                Boolean(settle.deferTriathlonTableSummary) ||
                shouldDeferTriathlonTableSummaryForLeg(
                    casualTournamentId,
                    gameId,
                    triathlonSessionActive
                );
            setTriathlonDeferTableSummary(deferTableSummary);

            if (
                deferTableSummary &&
                triathlonSessionActive &&
                onTriathlonNextGame &&
                tryAdvanceTriathlonMidSession({
                    triathlonSessionActive,
                    casualTournamentId,
                    matchGameId: gameId,
                    legScore: report.totalScore,
                    pendingTriathlon: pendingTriathlonAdvanceRef.current,
                    onTriathlonNextGame,
                    scoreReport: report,
                })
            ) {
                pendingTriathlonAdvanceRef.current = null;
                setTriathlonDeferTableSummary(false);
                return;
            }

            setPostCasualScoreReport(report);
            setPostCasualTableSummary(deferTableSummary ? null : settle.tableSummary ?? null);
            setPostCasualWeeklyLeagueSettle(settle.weeklyLeagueSettle ?? null);
            setPostCasualWaitingForPeers(deferTableSummary ? false : Boolean(settle.pendingOthers));
            setPostCasualReplayOffered(false);
            setPostCasualReplayTokenCount(0);
            setPostCasualCanReplay(false);
            setPostCasualReplayWindowEndsAt(undefined);
            setPostCasualScoreReportOpen(true);

            if (deferTableSummary) {
                return;
            }

            if (settle.tableSummary) {
                applyCasualTableSummaryFromQuery(settle.tableSummary, {
                    setTableSummary: setPostCasualTableSummary,
                    setReplayOffered: setPostCasualReplayOffered,
                    setReplayTokenCount: setPostCasualReplayTokenCount,
                    setCanReplay: setPostCasualCanReplay,
                    setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
                });
            } else {
                try {
                    const summary = await fetchTableSummaryForGame(gameId);
                    if (summary?.rows?.length) {
                        applyCasualTableSummaryFromQuery(summary, {
                            setTableSummary: setPostCasualTableSummary,
                            setReplayOffered: setPostCasualReplayOffered,
                            setReplayTokenCount: setPostCasualReplayTokenCount,
                            setCanReplay: setPostCasualCanReplay,
                            setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
                        });
                    }
                } catch (e) {
                    console.warn("[Solitaire] fetchCasualTableSummaryForGame after submit", e);
                }
            }
        },
        [loadSolitaireScoreReport, fetchTableSummaryForGame, casualTournamentId, triathlonSessionActive, onTriathlonNextGame]
    );

    const mapCasualPlatformRunActionResult = (
        cr: {
            ok?: boolean;
            tableSummary?: CasualAsyncTableSummaryUI;
            pendingOthers?: boolean;
            seedScoreThreshold?: number;
            success?: boolean;
            gameComplete?: boolean;
            nextGame?: TriathlonNextGame;
        },
        deferHost: boolean,
        score: number,
        matchGameId?: string
    ): CasualRunSubmitOutcome => {
        if (!cr.ok) return { ok: false };
        if (
            triathlonSessionActive &&
            matchGameId &&
            queueTriathlonMidSessionAdvance(cr, score, pendingTriathlonAdvanceRef, {
                templateId: casualTournamentId,
                gameId: matchGameId,
                triathlonSessionActive,
            })
        ) {
            return { ok: true, triathlonScoreReportOnly: true };
        }
        if (!deferHost) {
            onGameSubmit?.();
        }
        return {
            ok: true,
            ...(cr.tableSummary ? { tableSummary: cr.tableSummary } : {}),
            ...(cr.pendingOthers ? { pendingOthers: true } : {}),
            ...(cr.weeklyLeagueSettle ? { weeklyLeagueSettle: cr.weeklyLeagueSettle } : {}),
            ...(typeof cr.seedScoreThreshold === "number" ? { seedScoreThreshold: cr.seedScoreThreshold } : {}),
            ...(typeof cr.success === "boolean" ? { success: cr.success } : {}),
        };
    };

    const runSolitaireSettlement = useCallback(
        async (score: number, opts?: { deferHostNotify?: boolean }): Promise<CasualRunSubmitOutcome> => {
            const gs = gameStateRef.current;
            if (!gs || casualRunSubmittedRef.current) return { ok: false };
            casualRunSubmittedRef.current = true;
            const deferHost = Boolean(opts?.deferHostNotify);
            try {
                /** 权威分数走 solitaire `proxy.controller.submitCasualPlatformRun` → casual `/internal/casual-run-ingest`（不信任前端 score） */
                if (
                    casualTournamentId &&
                    typeof gs.gameId === "string" &&
                    gs.gameId.startsWith("game_") &&
                    casualPlatformAuthed
                ) {
                    const cr = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
                        ...buildCasualPlatformRunActionArgs({
                            gameId: gs.gameId,
                            platformBridge: casualPlatformBridge,
                        }),
                    })) as {
                        ok?: boolean;
                        error?: string;
                        tableSummary?: CasualAsyncTableSummaryUI;
                        pendingOthers?: boolean;
                        seedScoreThreshold?: number;
                        success?: boolean;
                    };
                    if (!cr.ok) {
                        console.warn("[Solitaire] submitCasualPlatformRun", cr.error);
                        casualRunSubmittedRef.current = false;
                        return { ok: false, error: cr.error };
                    }
                    return mapCasualPlatformRunActionResult(cr, deferHost, score, gs.gameId);
                }

                let proxyOk = false;
                try {
                    const sr = await convex.action(api.proxy.controller.submitScore, {
                        gameId: gs.gameId,
                        score,
                    });
                    proxyOk = Boolean((sr as { ok?: boolean })?.ok);
                    if (!proxyOk) {
                        console.warn("[Solitaire] proxy submitScore skipped or failed", sr);
                    }
                } catch (e) {
                    console.warn("[Solitaire] proxy submitScore error", e);
                }

                if (!proxyOk) {
                    casualRunSubmittedRef.current = false;
                    return {
                        ok: false,
                        error:
                            gs.gameId.startsWith("game_") && casualTournamentId
                                ? "casual_run_forbidden_client_submit"
                                : "proxy_submit_failed",
                    };
                }
                if (!deferHost) {
                    onGameSubmit?.();
                }
                return { ok: true };
            } catch (e) {
                console.error("[Solitaire] runSolitaireSettlement", e);
                casualRunSubmittedRef.current = false;
                return { ok: false, error: "network_error" };
            }
        },
        [convex, casualTournamentId, casualPlatformAuthed, onGameSubmit, casualPlatformBridge]
    );

    /** 强行结束：取消 timeout scheduler、服务端终局、ingest casual */
    const runForceEndCasualSettlement = useCallback(
        async (opts?: { deferHostNotify?: boolean }): Promise<CasualRunSubmitOutcome> => {
            const gs = gameStateRef.current;
            if (!gs || casualRunSubmittedRef.current) return { ok: false };
            if (
                !casualTournamentId ||
                typeof gs.gameId !== "string" ||
                !gs.gameId.startsWith("game_")
            ) {
                return { ok: false, error: "not_casual_run" };
            }
            if (!casualPlatformAuthed) {
                return { ok: false, error: "missing_casual_auth" };
            }
            casualRunSubmittedRef.current = true;
            const deferHost = Boolean(opts?.deferHostNotify);
            try {
                const cr = (await convex.action(api.proxy.controller.forceEndCasualPlatformRun, {
                    ...buildCasualPlatformRunActionArgs({
                        gameId: gs.gameId,
                        platformBridge: casualPlatformBridge,
                    }),
                })) as {
                    ok?: boolean;
                    error?: string;
                    tableSummary?: CasualAsyncTableSummaryUI;
                    pendingOthers?: boolean;
                    seedScoreThreshold?: number;
                    success?: boolean;
                };
                if (!cr.ok) {
                    console.warn("[Solitaire] forceEndCasualPlatformRun", cr.error);
                    casualRunSubmittedRef.current = false;
                    return { ok: false, error: cr.error };
                }
                mergeServerProgress(gs, { gameStatus: SoloGameStatus.CANCELLED });
                const score = Math.max(0, Math.floor(gs.score ?? 0));
                return mapCasualPlatformRunActionResult(cr, deferHost, score, gs.gameId);
            } catch (e) {
                console.error("[Solitaire] runForceEndCasualSettlement", e);
                casualRunSubmittedRef.current = false;
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes("unauthenticated")) {
                    return { ok: false, error: "missing_casual_auth" };
                }
                return { ok: false, error: "network_error" };
            }
        },
        [convex, casualTournamentId, casualPlatformAuthed, onGameSubmit, triathlonSessionActive, casualPlatformBridge]
    );

    const completeCasualSolitaireRun = useCallback(async () => {
        if (!gameState || casualRunSubmittedRef.current) return;
        if (!isTerminalSoloStatus(gameState.status)) return;
        const score = Math.max(0, Math.floor(gameState.score ?? 0));
        const r = await runSolitaireSettlement(score, { deferHostNotify: true });
        if (!r.ok) {
            console.warn("[Solitaire] completeCasualSolitaireRun submit failed");
            return;
        }
        const isCasualRun =
            Boolean(casualTournamentId) &&
            typeof gameState.gameId === "string" &&
            gameState.gameId.startsWith("game_");
        if (isCasualRun) {
            if (r.triathlonScoreReportOnly) {
                await beginCasualPostSettleFlow(gameState.gameId, score, {
                    deferTriathlonTableSummary: true,
                });
                return;
            }
            await beginCasualPostSettleFlow(gameState.gameId, score, r);
        } else {
            onGameSubmit?.();
        }
    }, [gameState, runSolitaireSettlement, casualTournamentId, onGameSubmit, beginCasualPostSettleFlow]);

    const exitCasualRunAfterSettle = useCallback(
        async (opts: { hadReplayOffer: boolean }) => {
            const gs = gameStateRef.current;
            const isCasualRun =
                Boolean(casualTournamentId) &&
                gs &&
                typeof gs.gameId === "string" &&
                gs.gameId.startsWith("game_");
            if (opts.hadReplayOffer && isCasualRun && user?.uid) {
                try {
                    await casual.confirmCasualRunWithoutReplay(gs.gameId);
                    await casual.refreshCasualPlayer();
                } catch (e) {
                    console.warn("[Solitaire] confirmCasualRunWithoutReplay", e);
                }
            }
            setPostCasualSummaryOpen(false);
            setPostCasualTableSummary(null);
            setPostCasualWaitingForPeers(false);
            setPostCasualCanReplay(false);
            setPostCasualReplayOffered(false);
            setPostCasualReplayTokenCount(0);
            setPostCasualReplayWindowEndsAt(undefined);
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            onGameSubmit?.();
        },
        [casual, casualTournamentId, user?.uid, onGameSubmit]
    );

    const dismissPostCasualScoreReport = useCallback(() => {
        const hadReplayOffer = postCasualReplayOffered;
        const pendingTriathlon = pendingTriathlonAdvanceRef.current;
        const gs = gameStateRef.current;
        const matchGameId =
            typeof gs?.gameId === "string" && gs.gameId.startsWith("game_") ? gs.gameId : undefined;
        const deferTableSummary = shouldDeferTriathlonTableSummaryForLeg(
            casualTournamentId,
            matchGameId,
            triathlonSessionActive
        );
        const legScore =
            postCasualScoreReport?.totalScore ?? Math.max(0, Math.floor(gs?.score ?? 0));
        const scoreReportSnapshot = postCasualScoreReport;
        setPostCasualScoreReportOpen(false);
        setPostCasualScoreReport(null);
        setTriathlonDeferTableSummary(false);
        if (
            tryAdvanceTriathlonMidSession({
                triathlonSessionActive,
                casualTournamentId,
                matchGameId,
                legScore,
                pendingTriathlon,
                onTriathlonNextGame,
                scoreReport: scoreReportSnapshot ?? undefined,
            })
        ) {
            pendingTriathlonAdvanceRef.current = null;
            return;
        }
        if (
            shouldOpenCasualTableSummaryAfterScoreReport(
                casualTournamentId,
                postCasualTableSummary,
                postCasualWaitingForPeers,
                {
                    deferTriathlonTableSummary: deferTableSummary,
                    triathlonSessionActive,
                    triathlonGameId: matchGameId,
                }
            )
        ) {
            setPostCasualSummaryOpen(true);
        } else {
            void exitCasualRunAfterSettle({ hadReplayOffer: hadReplayOffer });
        }
    }, [
        casualTournamentId,
        postCasualTableSummary,
        postCasualWaitingForPeers,
        postCasualReplayOffered,
        postCasualScoreReport,
        triathlonSessionActive,
        onTriathlonNextGame,
        exitCasualRunAfterSettle,
    ]);

    const dismissPostCasualSummary = useCallback(() => {
        void exitCasualRunAfterSettle({ hadReplayOffer: postCasualReplayOffered });
    }, [postCasualReplayOffered, exitCasualRunAfterSettle]);

    const openWatch = useCallback((ctx: CasualWatchContext, displayLabel: string) => {
        setWatchTarget(ctx);
        setWatchTargetLabel(displayLabel);
    }, []);

    const closeWatch = useCallback(() => {
        setWatchTarget(null);
        setWatchTargetLabel("");
    }, []);

    const openSelfReplay = useCallback(() => {
        const gid = gameStateRef.current?.gameId;
        if (!gid) return;
        openWatch({ kind: "recorded", gameId: gid }, "你");
    }, [openWatch]);

    const replayCasualRun = useCallback(async () => {
        const gs = gameStateRef.current;
        if (!gs || !casualPlatformAuthed || casualReplayBusy) return;
        if (typeof gs.gameId !== "string" || !gs.gameId.startsWith("game_")) return;
        setCasualReplayBusy(true);
        try {
            const rr = (await convex.action(api.proxy.controller.replayCasualRun, {
                gameId: gs.gameId,
                ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
            })) as { ok?: boolean; error?: string };
            if (!rr?.ok) {
                console.warn("[Solitaire] replayCasualRun", rr?.error);
                return;
            }
            casualRunSubmittedRef.current = false;
            setPostCasualSummaryOpen(false);
            setPostCasualTableSummary(null);
            setPostCasualWaitingForPeers(false);
            setPostCasualCanReplay(false);
            setPostCasualReplayOffered(false);
            setPostCasualReplayTokenCount(0);
            setPostCasualReplayWindowEndsAt(undefined);
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            await reloadCasualRun();
        } catch (e) {
            console.error("[Solitaire] replayCasualRun", e);
        } finally {
            setCasualReplayBusy(false);
        }
    }, [convex, casualPlatformAuthed, casualReplayBusy, reloadCasualRun, casualPlatformBridge]);

    const cancelSettleConfirm = useCallback(() => {
        setSettleConfirmOpen(false);
        settleInFlightRef.current = false;
        casualRunSubmittedRef.current = false;
    }, []);

    const finishManualSettleSuccess = useCallback(
        (extras?: ManualSettleConfirmExtras) => {
            setSettleConfirmOpen(false);
            const gs = gameStateRef.current;
            const isCasualRun =
                Boolean(casualTournamentId) &&
                gs &&
                typeof gs.gameId === "string" &&
                gs.gameId.startsWith("game_");
            if (!isCasualRun || !gs) {
                onGameSubmit?.();
                return;
            }
            const score = Math.max(0, Math.floor(gs.score ?? 0));
            void beginCasualPostSettleFlow(gs.gameId, score, {
                tableSummary: extras?.tableSummary ?? undefined,
                pendingOthers: extras?.pendingOthers,
                ...(extras?.triathlonScoreReportOnly || extras?.deferTriathlonTableSummary
                    ? { deferTriathlonTableSummary: true }
                    : {}),
                ...(typeof extras?.seedScoreThreshold === "number"
                    ? { seedScoreThreshold: extras.seedScoreThreshold, success: extras.success }
                    : {}),
            });
        },
        [casualTournamentId, onGameSubmit, beginCasualPostSettleFlow]
    );

    const confirmSettleAndExit = useCallback(async () => {
        const gs = gameStateRef.current;
        if (!gs || casualRunSubmittedRef.current || settleInFlightRef.current) {
            throw new Error("当前无法结算");
        }
        if (interactionPhaseRef.current !== GameInteractionPhase.idle) {
            throw new Error("当前无法结算");
        }
        settleInFlightRef.current = true;
        try {
            const isCasualGameId =
                typeof gs.gameId === "string" && gs.gameId.startsWith("game_");
            if (Boolean(casualTournamentId) && isCasualGameId && !casualPlatformAuthed) {
                throw new Error(casualSettleErrorMessage("missing_casual_auth"));
            }
            const isCasualRun =
                Boolean(casualTournamentId) && isCasualGameId && casualPlatformAuthed;

            const settled = isCasualRun
                ? await runForceEndCasualSettlement({ deferHostNotify: true })
                : await (async () => {
                      const res = await convex.mutation(api.service.gameManager.concedeGame, {
                          gameId: gs.gameId,
                      });
                      if (!res?.ok) {
                          throw new Error("认输失败，请重试");
                      }
                      mergeServerProgress(gs, {
                          score: res.score,
                          moves: res.moves,
                          gameStatus: res.gameStatus,
                      });
                      const score = Math.max(0, Math.floor(gs.score ?? 0));
                      return runSolitaireSettlement(score, { deferHostNotify: true });
                  })();

            if (!settled.ok) {
                throw new Error(casualSettleErrorMessage(settled.error));
            }
            const out: ManualSettleConfirmExtras = {};
            if (settled.tableSummary) out.tableSummary = settled.tableSummary;
            if (settled.pendingOthers) out.pendingOthers = true;
            if (typeof settled.seedScoreThreshold === "number") {
                out.seedScoreThreshold = settled.seedScoreThreshold;
                out.success = Boolean(settled.success);
            }
            if (settled.triathlonScoreReportOnly) {
                out.triathlonScoreReportOnly = true;
                out.deferTriathlonTableSummary = true;
            }
            return out;
        } catch (e) {
            console.error("[Solitaire] confirmSettleAndExit", e);
            if (e instanceof Error) throw e;
            throw new Error("结算失败，请稍后重试");
        } finally {
            settleInFlightRef.current = false;
        }
    }, [convex, casualTournamentId, casualPlatformAuthed, runSolitaireSettlement, runForceEndCasualSettlement]);

    const settleManuallyAndExit = useCallback(async () => {
        if (settleConfirmOpen) {
            cancelSettleConfirm();
            return;
        }
        if (casualRunSubmittedRef.current) {
            if (postCasualSummaryOpen || postCasualScoreReportOpen) {
                void exitCasualRunAfterSettle({ hadReplayOffer: postCasualReplayOffered });
            }
            return;
        }
        if (!gameState || settleInFlightRef.current) return;
        if (interactionPhase !== GameInteractionPhase.idle) return;

        if (isTerminalSoloStatus(gameState.status)) {
            const score = Math.max(0, Math.floor(gameState.score ?? 0));
            const r = await runSolitaireSettlement(score, { deferHostNotify: true });
            if (!r.ok) {
                console.warn("[Solitaire] settleManuallyAndExit terminal submit failed");
                return;
            }
            const isCasualRun =
                Boolean(casualTournamentId) &&
                typeof gameState.gameId === "string" &&
                gameState.gameId.startsWith("game_");
            if (isCasualRun) {
                if (r.triathlonScoreReportOnly) {
                    await beginCasualPostSettleFlow(gameState.gameId, score, {
                        deferTriathlonTableSummary: true,
                    });
                    return;
                }
                await beginCasualPostSettleFlow(gameState.gameId, score, r);
            } else {
                onGameSubmit?.();
            }
            return;
        }

        setSettleConfirmOpen(true);
    }, [
        gameState,
        interactionPhase,
        runSolitaireSettlement,
        casualTournamentId,
        onGameSubmit,
        beginCasualPostSettleFlow,
        settleConfirmOpen,
        cancelSettleConfirm,
        postCasualSummaryOpen,
        postCasualScoreReportOpen,
        postCasualReplayOffered,
        exitCasualRunAfterSettle,
    ]);
    const cancelDrag = useCallback((data: SoloActionData) => {
        if (!data?.card) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        setInteractionPhase(GameInteractionPhase.animating);
        PlayEffects.dragCancel({
            data: { cards: [data.card, ...(data.cards || [])], gameState, boardDimensionRef },
            onComplete: () => {
                if (gameState) syncCardStackZIndexFromGameState(gameState);
                setInteractionPhase(GameInteractionPhase.idle);
            },
        });
    }, [gameState, boardDimensionRef, setInteractionPhase]);

    const drawCard = useCallback(async (data: SoloActionData) => {
        const { card } = data;
        if (!gameState || !ruleManager || !card) return;
        if (isTerminalSoloStatus(gameState.status)) return;
        if (!ruleManager.canDraw(card.id)) return;

        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        let serverSnap: ServerProgress = {};
        try {
            const result = (await convex.mutation(api.service.gameManager.draw, {
                gameId: gameState.gameId,
                cardId: card.id,
            })) as ActionResult & ServerProgress;

            if (!result.ok || !result.data?.draw?.length) {
                throw new Error("draw_failed");
            }

            updateCards = result.data.draw as SoloCard[];
            serverSnap = {
                score: result.score,
                moves: result.moves,
                gameStatus: result.gameStatus,
            };

            const drawnWithEle = updateCards.map((c) =>
                mergeServerFaceOntoDomCard(
                    gameState.cards.find((gc) => gc.id === c.id),
                    c
                )
            );
            for (const drawn of drawnWithEle) {
                if (drawn.ele && drawn.rank) {
                    popCard(drawn);
                }
            }

            await new Promise<void>((resolve) => {
                PlayEffects.drawCard({
                    data: { cards: drawnWithEle, boardDimensionRef, gameState },
                    onComplete: () => resolve(),
                });
            });

            saveUpdate(updateCards);
            mergeServerProgress(gameState, serverSnap);
            void completeCasualSolitaireRun();
        } catch (e) {
            console.error("drawCard failed:", e);
        } finally {
            setInteractionPhase(GameInteractionPhase.idle);
        }
    }, [
        ruleManager,
        gameState,
        boardDimensionRef,
        convex,
        saveUpdate,
        setInteractionPhase,
        completeCasualSolitaireRun,
    ]);

    const moveCard = useCallback(async (data: SoloActionData) => {
        const { card, dropTarget, autoFoundationMove } = data;
        if (!gameState || !ruleManager || !card || !dropTarget) return;
        if (isTerminalSoloStatus(gameState.status)) return;

        const plan = SoloGameEngine.planMoveCard(gameState, card as Card, dropTarget.zoneId);
        if (!plan.ok) {
            console.log("moveCard failed", plan);
            return;
        }

        const moveData = attachMovePlanEle(gameState, (plan.data?.move ?? []) as SoloCard[]);
        const pendingFlipId = plan.data?.flip?.[0]?.id;
        const flipDuration = autoFoundationMove
            ? SOLO_ANIMATION_CONFIG.duration.flip.autoFoundation
            : SOLO_ANIMATION_CONFIG.duration.flip.normal;

        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        let serverSnap: ServerProgress = {};
        let flipSession: FlipGenericSession | null = null;

        if (pendingFlipId) {
            const flipDom = gameState.cards.find((c: SoloCard) => c.id === pendingFlipId);
            if (flipDom) {
                flipSession = startFlipGeneric({ card: flipDom, duration: flipDuration });
            }
        }

        try {
            const mutationPromise = convex
                .mutation(api.service.gameManager.move, {
                    gameId: gameState.gameId,
                    cardId: card.id,
                    toZone: dropTarget.zoneId,
                })
                .then((result: ActionResult & ServerProgress) => {
                    if (!result.ok || !result.data?.move?.length) {
                        throw new Error("move_failed");
                    }
                    updateCards.push(...(result.data.move as SoloCard[]));
                    if (result.data.flip?.length) {
                        updateCards.push(...(result.data.flip as SoloCard[]));
                    }
                    serverSnap = {
                        score: result.score,
                        moves: result.moves,
                        gameStatus: result.gameStatus,
                    };
                    return result;
                });

            const movePromise = new Promise<void>((resolve) => {
                PlayEffects.moveCard({
                    data: {
                        boardDimensionRef,
                        gameState,
                        moveCards: moveData,
                        targetZoneId: dropTarget.zoneId,
                        autoFoundationMove,
                    },
                    onComplete: () => resolve(),
                });
            });

            const result = await Promise.all([mutationPromise, movePromise]).then(([r]) => r);

            const serverFlip = result.data?.flip?.[0] as SoloCard | undefined;
            if (serverFlip?.rank && serverFlip?.suit) {
                const faceCard = mergeServerFaceOntoDomCard(
                    gameState.cards.find((c: SoloCard) => c.id === serverFlip.id),
                    serverFlip
                );
                await new Promise<void>((resolve) => {
                    if (flipSession && faceCard.ele) {
                        flipSession.completeReveal(faceCard, resolve);
                    } else if (faceCard.ele) {
                        PlayEffects.flipCard({
                            data: {
                                card: faceCard,
                                gameState,
                                duration: flipDuration,
                            },
                            onComplete: resolve,
                        });
                    } else {
                        resolve();
                    }
                });
            } else if (flipSession) {
                await new Promise<void>((resolve) => flipSession!.cancel(resolve));
            }

            saveUpdate(updateCards);
            mergeServerProgress(gameState, serverSnap);
            void completeCasualSolitaireRun();
        } catch (e) {
            console.error("moveCard failed:", e);
            if (flipSession) {
                await new Promise<void>((resolve) => flipSession!.cancel(resolve));
            }
        } finally {
            setInteractionPhase(GameInteractionPhase.idle);
        }
    }, [
        gameState,
        boardDimensionRef,
        ruleManager,
        convex,
        saveUpdate,
        setInteractionPhase,
        completeCasualSolitaireRun,
    ]);

    const onDrop = useCallback(async (data: SoloActionData) => {
        if (!gameState || !ruleManager) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        if (isTerminalSoloStatus(gameState.status)) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        const { dropTarget, card, actModes } = data;
        if (!card || !actModes?.includes(ActMode.DRAG)) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }

        console.log("onDrop", data);
        if (card.zone === ZoneType.TALON && ruleManager.canDraw(card.id)) {
            setInteractionPhase(GameInteractionPhase.animating);
            await drawCard(data);
            return;
        }
        if (dropTarget && ruleManager.canMoveToZone(card as Card, dropTarget.zoneId)) {
            await moveCard(data);
            return;
        }
        cancelDrag(data);

    }, [gameState, ruleManager, setInteractionPhase, drawCard, moveCard, cancelDrag]);

    const onClickOrTouch = useCallback((data: SoloActionData) => {
        if (!ruleManager || !gameState) return;
        if (isTerminalSoloStatus(gameState.status)) return;
        const { card, cards, actModes, maxDragFromStart } = data;
        if (!card) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        /** 超过此像素视为「拖过又松手」，短距离分支只取消，不走 findTarget 自动走牌 */
        const SUBSTANTIAL_DRAG_PX = 6;
        if (actModes?.includes(ActMode.DRAG) && (maxDragFromStart ?? 0) > SUBSTANTIAL_DRAG_PX) {
            cancelDrag(data);
            return;
        }
        // 轻点/微移：收回 pointermove 造成的偏差再走点击逻辑
        if (actModes?.includes(ActMode.DRAG) && card.ele && boardDimensionRef.current) {
            const stack = [card, ...(cards || [])].filter(Boolean) as SoloCard[];
            const zoneId = card.zoneId;
            const zoneCards = gameState.cards
                .filter((c: SoloCard) => c.zoneId === zoneId)
                .sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
            for (const c of stack) {
                if (!c.ele) continue;
                const { x, y } = getCardCoord(c, zoneCards, boardDimensionRef);
                const z = soloCardZIndex(c, zoneCards);
                gsap.set(c.ele, { x, y, zIndex: z });
            }
            syncCardStackZIndexFromGameState(gameState);
        }
        const target = ruleManager?.findTarget(card as Card);
        if (target) {
            if (card.zoneId === ZoneType.TALON) {
                void drawCard(data);
            } else {
                void moveCard({ ...data, dropTarget: target });
            }
        } else {
            setInteractionPhase(GameInteractionPhase.idle);
        }
        return
    }, [gameState, ruleManager, boardDimensionRef, setInteractionPhase, drawCard, moveCard, cancelDrag]);

    const recycle = useCallback(async () => {
        if (!gameState) return;
        if (isTerminalSoloStatus(gameState.status)) return;
        setInteractionPhase(GameInteractionPhase.animating);

        const result = SoloGameEngine.recycle(gameState);
        if (!result.ok) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        const cards = result.data?.update || [];
        let serverSnap: ServerProgress = {};
        const recyclePromise = new Promise<void>((resolve) => {
            convex
                .mutation(api.service.gameManager.recycle, { gameId: gameState.gameId })
                .then((r: { ok: boolean } & ServerProgress) => {
                    console.log("recycle result", r);
                    if (r.ok) {
                        serverSnap = {
                            score: r.score,
                            moves: r.moves,
                            gameStatus: r.gameStatus,
                        };
                    }
                    resolve();
                })
                .catch((error) => {
                    console.error("recycle failed:", error);
                    resolve();
                });
        });
        const playPromise = new Promise<void>((resolve) => {
            PlayEffects.recycle({
                data: { gameState, boardDimensionRef, cards },
                onComplete: () => {
                    saveUpdate(cards);
                    mergeServerProgress(gameState, serverSnap);
                    setInteractionPhase(GameInteractionPhase.idle);
                    resolve();
                },
            });
        });
        await Promise.all([recyclePromise, playPromise]);
        setInteractionPhase(GameInteractionPhase.idle);
        return;
    }, [gameState, boardDimensionRef, convex, saveUpdate, setInteractionPhase]);
    const deal = useCallback(async (effectType: 'default' | 'fan' | 'spiral' | 'wave' | 'explosion' = 'default') => {
        if (!gameState) return;
        setInteractionPhase(GameInteractionPhase.animating);
        const dealResult = await convex.mutation(api.service.gameManager.deal, { gameId: gameState.gameId });
        if (dealResult && dealResult.ok) {
            const dealedCards = dealResult.data?.update || [];
            console.log("dealedCards", dealedCards, effectType);
            dealEffect({
                effectType: effectType,
                data: { cards: dealedCards, gameState, boardDimensionRef, boardDimension },
                onComplete: () => {
                    saveUpdate(dealedCards);
                    gameState.status = SoloGameStatus.DEALED;
                    setInteractionPhase(GameInteractionPhase.idle);
                }
            });
        } else {
            setInteractionPhase(GameInteractionPhase.idle);
        }

    }, [gameState, boardDimension, boardDimensionRef, convex, saveUpdate, setInteractionPhase]);

    /** 全明且贪心收 foundation 可胜利时，连续执行收牌（需 config.autoComplete） */
    const runAutoCompleteToFoundation = useCallback(async () => {
        if (!gameState || !config.autoComplete) return;
        if (isTerminalSoloStatus(gameState.status)) return;
        if (interactionPhase !== GameInteractionPhase.idle) return;
        if (!SoloGameEngine.canAutoCompleteWithFoundationOnly(gameState)) return;
        while (true) {
            const next = SoloGameEngine.findNextFoundationMove(gameState);
            if (!next) break;
            await moveCard({
                card: next.card as SoloCard,
                dropTarget: { zoneId: next.toZoneId },
                actModes: [ActMode.DRAG],
                autoFoundationMove: true
            });
        }
    }, [gameState, config.autoComplete, interactionPhase, moveCard]);

    return {
        onClickOrTouch,
        onDrop,
        recycle,
        deal,
        cancelDrag,
        runAutoCompleteToFoundation,
        settleManuallyAndExit,
        settleConfirmOpen,
        cancelSettleConfirm,
        confirmSettleAndExit,
        finishManualSettleSuccess,
        postCasualScoreReportOpen,
        postCasualScoreReport,
        dismissPostCasualScoreReport,
        postCasualSummaryOpen,
        postCasualTableSummary,
        postCasualWeeklyLeagueSettle,
        postCasualWaitingForPeers,
        postCasualCanReplay,
        postCasualReplayOffered,
        postCasualReplayTokenCount,
        postCasualReplayWindowEndsAt,
        casualReplayBusy,
        replayCasualRun,
        dismissPostCasualSummary,
        watchTarget,
        watchTargetLabel,
        openWatch,
        closeWatch,
        openSelfReplay,
    };
};

export default useActHandler;
