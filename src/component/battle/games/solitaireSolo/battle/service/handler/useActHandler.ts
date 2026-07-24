import {
    createZones,
    SoloGameEngine,
} from "@/convex/solitaireArena/convex/service/SoloGameEngine";
import { useCasualPlatform } from "component/lobby/casual/service/useCasualPlatformManager";
import { useUserManager } from "host/service/UserManager";
import { usePlatformAuth } from "host/service/platformAuth/PlatformAuthProvider";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useConvex } from "convex/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { layoutAllSoloCardsFromModel } from "../../soloCardLayout";
import { useSoloGameManager } from "../GameManager";
import { autoCompleteLayoutGate } from "../../autoCompleteLayoutGate";
import {
    buildSolitaireScoreReport,
    isCasualSoloP75ChallengeTemplate,
    shouldOpenCasualTableSummaryAfterScoreReport,
    type CasualGameScoreReportUI,
} from "../../../../shared/casualGameScoreReportUI";
import type { CasualWatchContext } from "../../../../shared/casualAsyncTableSummaryUI";
import { buildCasualPlatformRunActionArgs } from "../../../../shared/casualPlatformActionArgs";
import { fetchCasualAsyncTableSummaryForGame } from "../../../../shared/fetchCasualAsyncTableSummary";
import { confirmCasualRunWithoutReplayForBridge } from "../../../../shared/confirmCasualRunWithoutReplay";
import { executeCasualRunReplay } from "../../../../shared/executeCasualRunReplay";
import { portalErrorMessage } from "component/lobby/portal/shared/portalErrorMessage";
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

function applyServerProgress(
    syncReplayScore: (source: SoloGameState) => void,
    gs: SoloGameState,
    p: ServerProgress,
    opts?: { allowCompleted?: boolean }
): SoloGameState {
    let gameStatus = p.gameStatus;
    // 默认不信任服务端 COMPLETED（旧 isGameWon / 空 zones 会误标）；仅 allowCompleted 时接受
    if (
        typeof gameStatus === "number" &&
        Number(gameStatus) === SoloGameStatus.COMPLETED &&
        opts?.allowCompleted !== true
    ) {
        gameStatus = SoloGameStatus.PLAYING;
    }
    const next = {
        ...gs,
        ...(typeof p.score === "number" ? { score: p.score } : {}),
        ...(typeof p.moves === "number" ? { moves: p.moves } : {}),
        ...(typeof gameStatus === "number" ? { status: gameStatus } : {}),
    };
    if (
        typeof p.score !== "number" &&
        typeof p.moves !== "number" &&
        typeof gameStatus !== "number"
    ) {
        return gs;
    }
    syncReplayScore(next);
    return next;
}

/** 把 mutation 返回的牌面 patch 合进本地 state（供 ref / 终局立刻使用，不等 React 重渲染） */
function mergeCardPatches(
    gs: SoloGameState,
    patches: SoloCard[]
): SoloGameState {
    if (!patches.length) return gs;
    const byId = new Map(patches.map((c) => [c.id, c]));
    return {
        ...gs,
        cards: gs.cards.map((c) => {
            const p = byId.get(c.id);
            if (!p) return c;
            return {
                ...c,
                isRevealed: p.isRevealed ?? c.isRevealed,
                zone: p.zone ?? c.zone,
                zoneId: p.zoneId ?? c.zoneId,
                zoneIndex: p.zoneIndex ?? c.zoneIndex,
                ...(p.rank != null ? { rank: p.rank } : {}),
                ...(p.suit != null ? { suit: p.suit } : {}),
                ...(p.value != null ? { value: p.value } : {}),
                ...(p.isRed != null ? { isRed: p.isRed } : {}),
                ele: c.ele,
            };
        }),
    };
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

function isAllCardsOnFoundation(gs: SoloGameState): boolean {
    return gs.cards.every(
        (c) =>
            c.zone === ZoneType.FOUNDATION ||
            String(c.zoneId ?? "").startsWith("foundation-")
    );
}

/** 用于判断 React state 是否已追上 cheat / 本地规划后的牌面 */
function cardLayoutKey(gs: SoloGameState): string {
    return gs.cards
        .map((c) => `${c.id}:${c.zoneId}:${c.zoneIndex}:${c.isRevealed ? 1 : 0}`)
        .sort()
        .join("|");
}

function isTerminalSoloStatus(status: SoloGameStatus | number | undefined): boolean {
    const n = Number(status);
    return n === SoloGameStatus.COMPLETED || n === SoloGameStatus.CANCELLED;
}

/** 跨 StrictMode / 双 effect 的单飞锁，避免同一局并行跑两套 auto-complete */
const autoCompleteGameLocks = new Set<string>();

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
        syncReplayScore,
        syncReplayState,
        replayMode,
        targetScore,
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
    /** 结算过渡（卸遮罩 / 清 victory overflow / 开得分页）期间冻结牌桌重测，避免闪屏 */
    const postSettleLayoutFreezeRef = useRef(false);
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
    const [postCasualReplayMode, setPostCasualReplayMode] = useState<"ad" | "token">("token");
    const [postCasualReplayWindowEndsAt, setPostCasualReplayWindowEndsAt] = useState<number | undefined>(
        undefined
    );
    const [postCasualAdReplayDailyRemaining, setPostCasualAdReplayDailyRemaining] = useState<
        number | undefined
    >(undefined);
    const [casualReplayBusy, setCasualReplayBusy] = useState(false);
    const [casualReplayError, setCasualReplayError] = useState<string | null>(null);
    const [triathlonDeferTableSummary, setTriathlonDeferTableSummary] = useState(false);
    const [watchTarget, setWatchTarget] = useState<CasualWatchContext | null>(null);
    const [watchTargetLabel, setWatchTargetLabel] = useState("");
    const casualRunSubmittedRef = useRef(false);
    const timeoutUiShownRef = useRef(false);
    const pendingTriathlonAdvanceRef = useRef<TriathlonPendingAdvance | null>(null);
    const settleInFlightRef = useRef(false);
    const gameStateRef = useRef<SoloGameState | null>(null);
    const interactionPhaseRef = useRef<GameInteractionPhase>(GameInteractionPhase.idle);
    /** 自动清盘进行中：阻止 React 用旧 state 覆盖已推进的 ref */
    const autoCompleteRunningRef = useRef(false);

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
                setReplayMode: setPostCasualReplayMode,
                setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
            });
        },
    });

    const holdGameStateRefSync = useRef(false);
    /** 广告再战等清档重开：下一帧 React gameState 必须覆盖 ref（哪怕 moves 变少） */
    const acceptReloadedGameStateRef = useRef(false);

    useEffect(() => {
        if (!gameState) {
            gameStateRef.current = null;
            holdGameStateRefSync.current = false;
            acceptReloadedGameStateRef.current = false;
            return;
        }
        const cur = gameStateRef.current;
        if (acceptReloadedGameStateRef.current) {
            acceptReloadedGameStateRef.current = false;
            holdGameStateRefSync.current = false;
            gameStateRef.current = gameState;
            return;
        }
        // 同 gameId 再战 / 清档：moves 归零的新局必须覆盖 ref（含 hold 期间）
        const isCasualRedeal =
            Boolean(cur) &&
            (gameState.moves ?? 0) === 0 &&
            (cur!.moves ?? 0) > 0 &&
            !isTerminalSoloStatus(gameState.status);
        const resetAfterTerminal =
            Boolean(cur) &&
            isTerminalSoloStatus(cur!.status) &&
            !isTerminalSoloStatus(gameState.status);

        // Ctrl+Shift+A 等会先写 ref；在 React state 追上前禁止旧 render 覆盖
        if (holdGameStateRefSync.current) {
            if (isCasualRedeal || resetAfterTerminal) {
                holdGameStateRefSync.current = false;
                gameStateRef.current = gameState;
                return;
            }
            if (cur && cardLayoutKey(cur) === cardLayoutKey(gameState)) {
                holdGameStateRefSync.current = false;
                gameStateRef.current = gameState;
            }
            return;
        }
        // 自动清盘等路径会先写 ref 再等 React 提交；勿用更旧的 render 覆盖
        if (cur && (cur.moves ?? 0) > (gameState.moves ?? 0)) {
            if (!resetAfterTerminal && !isCasualRedeal) return;
        }
        if (autoCompleteRunningRef.current) return;
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        interactionPhaseRef.current = interactionPhase;
    }, [interactionPhase]);

    /** DEV：Ctrl+Shift+A → 服务端推到近自动清盘布局，本地同步后应触发 autoComplete */
    useEffect(() => {
        if (!import.meta.env.DEV) return;
        if (replayMode) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a"))) return;
            if (e.repeat) return;
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable)
            ) {
                return;
            }
            e.preventDefault();
            const gs = gameStateRef.current;
            if (!gs?.gameId) {
                console.warn("[Solitaire DEV] Ctrl+Shift+A: no active game");
                return;
            }
            // 允许从过早 COMPLETED（牌未收齐）再 cheat；真正收齐或已放弃才拦
            if (Number(gs.status) === SoloGameStatus.CANCELLED) {
                console.warn("[Solitaire DEV] Ctrl+Shift+A: game cancelled");
                return;
            }
            if (
                Number(gs.status) === SoloGameStatus.COMPLETED &&
                isAllCardsOnFoundation(gs)
            ) {
                console.warn("[Solitaire DEV] Ctrl+Shift+A: already cleared");
                return;
            }
            if (autoCompleteRunningRef.current) {
                console.warn("[Solitaire DEV] Ctrl+Shift+A: auto-complete already running");
                return;
            }
            if (casualRunSubmittedRef.current) {
                console.warn("[Solitaire DEV] Ctrl+Shift+A: run already settled");
                return;
            }
            void (async () => {
                try {
                    setInteractionPhase(GameInteractionPhase.animating);
                    const result = (await convex.mutation(api.service.gameManager.devForceNearAutoComplete, {
                        gameId: gs.gameId,
                    })) as {
                        ok?: boolean;
                        error?: string;
                        data?: SoloGameState;
                        score?: number;
                        moves?: number;
                        gameStatus?: number;
                    };
                    if (!result?.ok || !result.data) {
                        console.warn("[Solitaire DEV] near-auto-complete failed", result?.error ?? result);
                        return;
                    }
                    const zones =
                        result.data.zones?.length > 0
                            ? result.data.zones
                            : gs.zones?.length
                              ? gs.zones
                              : createZones();
                    const merged: SoloGameState = {
                        ...gs,
                        ...result.data,
                        zones,
                        cards: gs.cards.map((t) => {
                            const s = result.data!.cards.find((c) => c.id === t.id);
                            if (!s) return t;
                            return {
                                ...t,
                                isRevealed: s.isRevealed ?? t.isRevealed,
                                zone: s.zone ?? t.zone,
                                zoneId: s.zoneId ?? t.zoneId,
                                zoneIndex: s.zoneIndex ?? t.zoneIndex,
                                ...(s.rank != null ? { rank: s.rank } : {}),
                                ...(s.suit != null ? { suit: s.suit } : {}),
                                ...(s.value != null ? { value: s.value } : {}),
                                ...(s.isRed != null ? { isRed: s.isRed } : {}),
                                ele: t.ele,
                            };
                        }),
                        score: result.score ?? result.data.score ?? gs.score,
                        moves: result.moves ?? result.data.moves ?? gs.moves,
                        // 强制 PLAYING：避免服务端过早 COMPLETED 残留挡住 auto-complete
                        status: SoloGameStatus.PLAYING,
                    };
                    syncReplayState(merged);
                    gameStateRef.current = merged;
                    holdGameStateRefSync.current = true;
                    // 立刻落到布局坐标，避免残留拖拽/飞牌 transform
                    for (const card of merged.cards) {
                        if (!card.ele) continue;
                        const zoneCards = merged.cards
                            .filter((c) => c.zoneId === card.zoneId)
                            .sort((a, b) => a.zoneIndex - b.zoneIndex);
                        const { x, y } = getCardCoord(card, zoneCards, boardDimensionRef);
                        gsap.set(card.ele, { x, y, rotate: 0, scale: 1, clearProps: "zIndex" });
                    }
                    syncCardStackZIndexFromGameState(merged);
                    const probe = SoloGameEngine.findNextFoundationMove(merged);
                    console.info(
                        "[Solitaire DEV] near-auto-complete ready — auto-complete should run (Ctrl+Shift+A)",
                        {
                            next: probe
                                ? `${probe.card.rank}${probe.card.suit}→${probe.toZoneId}`
                                : null,
                            canAuto: SoloGameEngine.canAutoCompleteWithFoundationOnly(merged),
                            leftover: merged.cards.filter(
                                (c) =>
                                    c.zone !== ZoneType.FOUNDATION &&
                                    !String(c.zoneId ?? "").startsWith("foundation-")
                            ).length,
                        }
                    );
                } catch (err) {
                    console.error("[Solitaire DEV] near-auto-complete", err);
                } finally {
                    setInteractionPhase(GameInteractionPhase.idle);
                }
            })();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [
        replayMode,
        convex,
        syncReplayState,
        setInteractionPhase,
        boardDimensionRef,
    ]);

    useEffect(() => {
        casualRunSubmittedRef.current = false;
        timeoutUiShownRef.current = false;
        pendingTriathlonAdvanceRef.current = null;
        setTriathlonDeferTableSummary(false);
        setSettleConfirmOpen(false);
        setPostCasualScoreReportOpen(false);
        setPostCasualScoreReport(null);
        setPostCasualSummaryOpen(false);
        setPostCasualTableSummary(null);
        setPostCasualWaitingForPeers(false);
        setPostCasualCanReplay(false);
        setPostCasualReplayMode("token");
        setPostCasualReplayWindowEndsAt(undefined);
        setPostCasualAdReplayDailyRemaining(undefined);
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
            },
            options?: {
                /**
                 * 手动结算：等明细就绪后再开「本局得分」，并与关掉「正在结算」同帧切换，
                 * 避免双遮罩 / 占位→明细撑高导致的闪屏抖动。
                 */
                holdUntilReady?: boolean;
            }
        ) => {
            postSettleLayoutFreezeRef.current = true;

            const challengeThreshold =
                typeof settle.seedScoreThreshold === "number"
                    ? settle.seedScoreThreshold
                    : typeof targetScore === "number"
                      ? targetScore
                      : undefined;

            const attachChallenge = (report: CasualGameScoreReportUI): CasualGameScoreReportUI => {
                if (challengeThreshold == null) return report;
                const achievedScore = report.totalScore;
                const success =
                    typeof settle.success === "boolean"
                        ? settle.success
                        : achievedScore >= challengeThreshold;
                return {
                    ...report,
                    challenge: {
                        targetScore: challengeThreshold,
                        achievedScore,
                        success,
                    },
                };
            };

            const deferTableSummary =
                Boolean(settle.deferTriathlonTableSummary) ||
                shouldDeferTriathlonTableSummaryForLeg(
                    casualTournamentId,
                    gameId,
                    triathlonSessionActive
                );
            setTriathlonDeferTableSummary(deferTableSummary);

            const holdUntilReady = options?.holdUntilReady === true;

            if (!holdUntilReady) {
                // 通关路径：庆祝刚结束立刻盖层，避免裸桌
                const provisional = attachChallenge({
                    gameLabel: "Solitaire",
                    lines: [{ label: "本局得分", value: fallbackScore }],
                    totalScore: fallbackScore,
                });
                setPostCasualScoreReport(provisional);
                setPostCasualTableSummary(deferTableSummary ? null : settle.tableSummary ?? null);
                setPostCasualWeeklyLeagueSettle(settle.weeklyLeagueSettle ?? null);
                setPostCasualWaitingForPeers(deferTableSummary ? false : Boolean(settle.pendingOthers));
                setPostCasualReplayOffered(false);
                setPostCasualReplayTokenCount(0);
                setPostCasualCanReplay(false);
                setPostCasualReplayWindowEndsAt(undefined);
                setPostCasualAdReplayDailyRemaining(undefined);
                setPostCasualScoreReportOpen(true);
            }

            const report = attachChallenge(await loadSolitaireScoreReport(gameId, fallbackScore));

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
                setPostCasualScoreReportOpen(false);
                setPostCasualScoreReport(null);
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
            setPostCasualAdReplayDailyRemaining(undefined);
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
                    setReplayMode: setPostCasualReplayMode,
                    setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
                });
            }

            const shouldRefreshSoloPortalReplay =
                isCasualSoloP75ChallengeTemplate(casualTournamentId) &&
                casualTournamentId?.startsWith("portal_");
            if (shouldRefreshSoloPortalReplay || !settle.tableSummary) {
                try {
                    const summary = await fetchTableSummaryForGame(gameId);
                    if (summary) {
                        applyCasualTableSummaryFromQuery(summary, {
                            setTableSummary: setPostCasualTableSummary,
                            setReplayOffered: setPostCasualReplayOffered,
                            setReplayTokenCount: setPostCasualReplayTokenCount,
                            setCanReplay: setPostCasualCanReplay,
                            setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
                            setReplayMode: setPostCasualReplayMode,
                            setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
                        });
                    }
                } catch (e) {
                    console.warn("[Solitaire] fetchCasualTableSummaryForGame after submit", e);
                }
            }
        },
        [loadSolitaireScoreReport, fetchTableSummaryForGame, casualTournamentId, triathlonSessionActive, onTriathlonNextGame, targetScore]
    );

    const mergeCasualSettleIntoOpenOverlays = useCallback(
        (settled: Extract<CasualRunSubmitOutcome, { ok: true }>) => {
            if (settled.triathlonScoreReportOnly) return;
            if (typeof settled.seedScoreThreshold === "number") {
                setPostCasualScoreReport((prev) => {
                    if (!prev) return prev;
                    const success =
                        typeof settled.success === "boolean"
                            ? settled.success
                            : prev.totalScore >= settled.seedScoreThreshold!;
                    return {
                        ...prev,
                        challenge: {
                            targetScore: settled.seedScoreThreshold!,
                            achievedScore: prev.totalScore,
                            success,
                        },
                    };
                });
            } else if (typeof targetScore === "number") {
                setPostCasualScoreReport((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        challenge: {
                            targetScore: targetScore,
                            achievedScore: prev.totalScore,
                            success: prev.totalScore >= targetScore,
                        },
                    };
                });
            }
            if (settled.tableSummary) {
                applyCasualTableSummaryFromQuery(settled.tableSummary, {
                    setTableSummary: setPostCasualTableSummary,
                    setReplayOffered: setPostCasualReplayOffered,
                    setReplayTokenCount: setPostCasualReplayTokenCount,
                    setCanReplay: setPostCasualCanReplay,
                    setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
                    setReplayMode: setPostCasualReplayMode,
                    setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
                });
            }
            if (settled.pendingOthers) {
                setPostCasualWaitingForPeers(true);
            }
            if (settled.weeklyLeagueSettle) {
                setPostCasualWeeklyLeagueSettle(settled.weeklyLeagueSettle);
            }
        },
        [targetScore]
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
        const threshold =
            typeof cr.seedScoreThreshold === "number" ? cr.seedScoreThreshold : undefined;
        const success =
            typeof cr.success === "boolean"
                ? cr.success
                : threshold != null
                  ? score >= threshold
                  : undefined;
        return {
            ok: true,
            ...(cr.tableSummary ? { tableSummary: cr.tableSummary } : {}),
            ...(cr.pendingOthers ? { pendingOthers: true } : {}),
            ...(cr.weeklyLeagueSettle ? { weeklyLeagueSettle: cr.weeklyLeagueSettle } : {}),
            ...(threshold != null ? { seedScoreThreshold: threshold } : {}),
            ...(typeof success === "boolean" ? { success } : {}),
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
                applyServerProgress(syncReplayScore, gs, { gameStatus: SoloGameStatus.CANCELLED });
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
        [convex, casualTournamentId, casualPlatformAuthed, onGameSubmit, triathlonSessionActive, casualPlatformBridge, syncReplayScore]
    );

    const completeCasualSolitaireRunOnTimeout = useCallback(async () => {
        const gs = gameStateRef.current;
        if (!gs || settleInFlightRef.current) return;
        if (isTerminalSoloStatus(gs.status)) return;
        if (gs.dueTime == null || Date.now() < gs.dueTime) return;
        if (typeof gs.gameId !== "string" || !gs.gameId.startsWith("game_")) return;

        settleInFlightRef.current = true;
        const matchGameId = gs.gameId;
        const score = Math.max(0, Math.floor(gs.score ?? 0));
        try {
            if (!timeoutUiShownRef.current) {
                timeoutUiShownRef.current = true;
                applyServerProgress(syncReplayScore, gs, { gameStatus: SoloGameStatus.CANCELLED });
                await beginCasualPostSettleFlow(matchGameId, score, {});
            }

            if (!casualPlatformAuthed || casualRunSubmittedRef.current) return;

            const settled = await runForceEndCasualSettlement({ deferHostNotify: true });
            if (settled.ok) {
                if (settled.triathlonScoreReportOnly) {
                    return;
                }
                mergeCasualSettleIntoOpenOverlays(settled);
                return;
            }
            console.warn("[Solitaire] forceEnd on timeout failed", settled.error);
            const summary = await fetchTableSummaryForGame(matchGameId);
            if (summary) {
                applyCasualTableSummaryFromQuery(summary, {
                    setTableSummary: setPostCasualTableSummary,
                    setReplayOffered: setPostCasualReplayOffered,
                    setReplayTokenCount: setPostCasualReplayTokenCount,
                    setCanReplay: setPostCasualCanReplay,
                    setReplayWindowEndsAt: setPostCasualReplayWindowEndsAt,
                    setReplayMode: setPostCasualReplayMode,
                    setAdReplayDailyRemaining: setPostCasualAdReplayDailyRemaining,
                });
            }
        } catch (e) {
            console.error("[Solitaire] completeCasualSolitaireRunOnTimeout", e);
        } finally {
            settleInFlightRef.current = false;
        }
    }, [
        casualPlatformAuthed,
        runForceEndCasualSettlement,
        fetchTableSummaryForGame,
        syncReplayScore,
        beginCasualPostSettleFlow,
        mergeCasualSettleIntoOpenOverlays,
    ]);

    useEffect(() => {
        if (replayMode) return;
        const gs = gameState;
        if (!gs?.dueTime || isTerminalSoloStatus(gs.status)) return;

        let intervalId: number | undefined;
        const fire = () => {
            void completeCasualSolitaireRunOnTimeout();
        };
        const startPoll = () => {
            fire();
            intervalId = window.setInterval(fire, 1000);
        };

        const ms = gs.dueTime - Date.now();
        let timeoutId: number | undefined;
        if (ms <= 0) {
            startPoll();
        } else {
            timeoutId = window.setTimeout(startPoll, ms);
        }

        return () => {
            if (timeoutId != null) window.clearTimeout(timeoutId);
            if (intervalId != null) window.clearInterval(intervalId);
        };
    }, [
        replayMode,
        gameState?.gameId,
        gameState?.dueTime,
        gameState?.status,
        completeCasualSolitaireRunOnTimeout,
    ]);

    const completeCasualSolitaireRun = useCallback(async (overrideGs?: SoloGameState | null) => {
        const gs = overrideGs ?? gameStateRef.current ?? gameState;
        if (!gs || casualRunSubmittedRef.current) return;
        if (!isTerminalSoloStatus(gs.status)) return;
        const score = Math.max(0, Math.floor(gs.score ?? 0));
        postSettleLayoutFreezeRef.current = true;
        const r = await runSolitaireSettlement(score, { deferHostNotify: true });
        if (!r.ok) {
            console.warn("[Solitaire] completeCasualSolitaireRun submit failed", r);
            postSettleLayoutFreezeRef.current = false;
            return;
        }
        const isCasualRun =
            Boolean(casualTournamentId) &&
            typeof gs.gameId === "string" &&
            gs.gameId.startsWith("game_");
        if (isCasualRun) {
            if (r.triathlonScoreReportOnly) {
                await beginCasualPostSettleFlow(gs.gameId, score, {
                    deferTriathlonTableSummary: true,
                });
                return;
            }
            await beginCasualPostSettleFlow(gs.gameId, score, r);
            console.info("[Solitaire] post-settle UI opened", {
                gameId: gs.gameId,
                score,
            });
        } else {
            onGameSubmit?.();
        }
    }, [gameState, runSolitaireSettlement, casualTournamentId, onGameSubmit, beginCasualPostSettleFlow]);

    /**
     * 通关：立刻播庆祝；结算可等 `beforeSettle`（清盘后台 move 队列）完成后再提交，
     * 避免服务端仍 PLAYING → not_terminal → 关掉得分弹窗。
     */
    const finishWinWithVictoryEffect = useCallback(
        async (
            nextGs: SoloGameState,
            opts?: { beforeSettle?: Promise<unknown> }
        ) => {
            setInteractionPhase(GameInteractionPhase.animating);
            const wonGs: SoloGameState = {
                ...nextGs,
                status: SoloGameStatus.COMPLETED,
            };
            gameStateRef.current = wonGs;
            // 清盘期间 React 仍可能是旧 tableau；先锁布局再同步，避免胜利动画背景刷回牌列
            autoCompleteLayoutGate.blocked = true;
            const victoryRoot =
                document.querySelector(".solo-player-container") ??
                document.querySelector(".solo-board-surface");
            victoryRoot?.setAttribute("data-solo-victory", "1");
            // 同步 React status=COMPLETED，必须 flush，否则 layout effect 可能仍读到 PLAYING+tableau
            flushSync(() => {
                syncReplayState(wonGs);
            });

            const score = Math.max(0, Math.floor(wonGs.score ?? 0));

            const playVictory = async () => {
                try {
                    const dim = boardDimensionRef.current;
                    if (dim) {
                        for (const c of wonGs.cards) {
                            if (c.ele) gsap.killTweensOf(c.ele);
                        }
                        // 清盘末尾牌可能还在飞：直接吸附到 foundation 后立刻开扇
                        layoutAllSoloCardsFromModel(wonGs, dim, boardDimensionRef);
                    }
                    await new Promise<void>((resolve) => {
                        const fallback = window.setTimeout(resolve, 8000);
                        PlayEffects.gameOver({
                            effectType: "classicSimple",
                            data: {
                                cards: wonGs.cards,
                                boardDimension: boardDimensionRef.current,
                                gameState: wonGs,
                            },
                            onComplete: () => {
                                window.clearTimeout(fallback);
                                resolve();
                            },
                        });
                    });
                } catch (e) {
                    console.warn("[Solitaire] victory effect", e);
                }
            };

            // 庆祝立刻播；结算等清盘 move 队列（与庆祝并行），胜利结束马上盖得分弹窗
            const victoryPromise = playVictory();
            const settlePromise = (async () => {
                if (opts?.beforeSettle) {
                    try {
                        await opts.beforeSettle;
                    } catch (e) {
                        console.warn("[Solitaire] beforeSettle failed", e);
                    }
                }
                return runSolitaireSettlement(score, { deferHostNotify: true });
            })();

            await victoryPromise;

            // 庆祝结束立刻盖上得分遮罩（先于 settle 完成也可）
            postSettleLayoutFreezeRef.current = true;
            setInteractionPhase(GameInteractionPhase.idle);
            setPostCasualScoreReport({
                gameLabel: "Solitaire",
                lines: [{ label: "本局得分", value: score }],
                totalScore: score,
                ...(typeof targetScore === "number"
                    ? {
                          challenge: {
                              targetScore,
                              achievedScore: score,
                              success: score >= targetScore,
                          },
                      }
                    : {}),
            });
            setPostCasualScoreReportOpen(true);

            let r = await settlePromise;
            if (!r.ok && r.error === "not_terminal") {
                // 队列偶发未刷完：短等再试一次
                await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
                r = await runSolitaireSettlement(score, { deferHostNotify: true });
            }
            if (!r.ok) {
                console.warn("[Solitaire] win settle failed, trying forceEnd", r);
                r = await runForceEndCasualSettlement({ deferHostNotify: true });
            }

            const isCasualRun =
                Boolean(casualTournamentId) &&
                typeof wonGs.gameId === "string" &&
                wonGs.gameId.startsWith("game_");

            if (!r.ok) {
                console.warn("[Solitaire] win settle failed; keep local score report", r);
                // 保留本局得分弹窗，勿清空（否则胜利后像「中断」）
                victoryRoot?.removeAttribute("data-solo-victory");
                autoCompleteLayoutGate.blocked = false;
                return;
            }

            if (isCasualRun) {
                if (r.triathlonScoreReportOnly) {
                    await beginCasualPostSettleFlow(wonGs.gameId, score, {
                        deferTriathlonTableSummary: true,
                    });
                } else {
                    await beginCasualPostSettleFlow(wonGs.gameId, score, r);
                    console.info("[Solitaire] post-settle UI opened (with victory)", {
                        gameId: wonGs.gameId,
                        score,
                    });
                }
                requestAnimationFrame(() => {
                    victoryRoot?.removeAttribute("data-solo-victory");
                    autoCompleteLayoutGate.blocked = false;
                });
            } else {
                victoryRoot?.removeAttribute("data-solo-victory");
                autoCompleteLayoutGate.blocked = false;
                postSettleLayoutFreezeRef.current = false;
                setPostCasualScoreReportOpen(false);
                setPostCasualScoreReport(null);
                onGameSubmit?.();
            }
        },
        [
            boardDimensionRef,
            runSolitaireSettlement,
            runForceEndCasualSettlement,
            casualTournamentId,
            beginCasualPostSettleFlow,
            onGameSubmit,
            setInteractionPhase,
            syncReplayState,
            targetScore,
        ]
    );

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
                    await confirmCasualRunWithoutReplayForBridge({
                        matchGameId: gs.gameId,
                        platformBridge: casualPlatformBridge,
                        casualConfirm: casual.confirmCasualRunWithoutReplay,
                    });
                    if (casualPlatformBridge !== "portal") {
                        await casual.refreshCasualPlayer();
                    }
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
            postSettleLayoutFreezeRef.current = false;
            onGameSubmit?.();
        },
        [casual, casualTournamentId, casualPlatformBridge, user?.uid, onGameSubmit]
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
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
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
                    replayOffered: postCasualReplayOffered,
                }
            )
        ) {
            // 先开同桌榜再关得分页，避免中间一帧裸桌闪跳
            setPostCasualSummaryOpen(true);
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
        } else {
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
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
        setCasualReplayError(null);
        setCasualReplayBusy(true);
        // 点「看广告再战」后立刻收起结算层；失败再恢复。
        const restoreScoreReport = postCasualScoreReportOpen;
        const restoreSummary = postCasualSummaryOpen;
        setPostCasualScoreReportOpen(false);
        setPostCasualSummaryOpen(false);
        postSettleLayoutFreezeRef.current = false;
        try {
            const rr = await executeCasualRunReplay({
                convex,
                gameId: gs.gameId,
                platformBridge: casualPlatformBridge,
                replayMode: postCasualReplayMode,
                replayAction: (actionArgs) =>
                    convex.action(api.proxy.controller.replayCasualRun, actionArgs),
            });
            if (!rr.ok) {
                if (restoreScoreReport) setPostCasualScoreReportOpen(true);
                if (restoreSummary) setPostCasualSummaryOpen(true);
                setCasualReplayError(portalErrorMessage(rr.error));
                console.warn("[Solitaire] replayCasualRun", rr.error);
                return;
            }
            // 必须在 reload/setGameState 之前放行：否则 effect 可能先跑，
            // hold + moves 守卫把新局挡在 ref 外，客户端按旧牌面走子 → move_failed
            acceptReloadedGameStateRef.current = true;
            holdGameStateRefSync.current = false;
            const reloaded = await reloadCasualRun();
            if (!reloaded) {
                acceptReloadedGameStateRef.current = false;
                if (restoreScoreReport) setPostCasualScoreReportOpen(true);
                if (restoreSummary) setPostCasualSummaryOpen(true);
                setCasualReplayError(portalErrorMessage("match_not_open"));
                console.warn("[Solitaire] replayCasualRun reloadCasualRun failed");
                return;
            }
            // 再战可能连点：确保后续一帧仍接受 moves 归零的新局
            acceptReloadedGameStateRef.current = true;
            holdGameStateRefSync.current = false;
            casualRunSubmittedRef.current = false;
            autoCompleteRunningRef.current = false;
            setInteractionPhase(GameInteractionPhase.idle);
            document.querySelector(".solo-player-container")?.removeAttribute("data-solo-victory");
            document.querySelector(".solo-board-surface")?.removeAttribute("data-solo-victory");
            setPostCasualSummaryOpen(false);
            setPostCasualTableSummary(null);
            setPostCasualWaitingForPeers(false);
            setPostCasualCanReplay(false);
            setPostCasualReplayOffered(false);
            setPostCasualReplayTokenCount(0);
            setPostCasualReplayMode("token");
            setPostCasualReplayWindowEndsAt(undefined);
            setPostCasualAdReplayDailyRemaining(undefined);
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            setCasualReplayError(null);
            postSettleLayoutFreezeRef.current = false;
        } catch (e) {
            if (restoreScoreReport) setPostCasualScoreReportOpen(true);
            if (restoreSummary) setPostCasualSummaryOpen(true);
            setCasualReplayError(portalErrorMessage("complete_failed"));
            console.error("[Solitaire] replayCasualRun", e);
        } finally {
            setCasualReplayBusy(false);
        }
    }, [
        convex,
        casualPlatformAuthed,
        casualReplayBusy,
        postCasualScoreReportOpen,
        postCasualSummaryOpen,
        postCasualReplayMode,
        reloadCasualRun,
        casualPlatformBridge,
        setInteractionPhase,
    ]);

    const cancelSettleConfirm = useCallback(() => {
        setSettleConfirmOpen(false);
        settleInFlightRef.current = false;
        casualRunSubmittedRef.current = false;
        postSettleLayoutFreezeRef.current = false;
    }, []);

    const finishManualSettleSuccess = useCallback(
        (extras?: ManualSettleConfirmExtras) => {
            postSettleLayoutFreezeRef.current = true;
            const gs = gameStateRef.current;
            const isCasualRun =
                Boolean(casualTournamentId) &&
                gs &&
                typeof gs.gameId === "string" &&
                gs.gameId.startsWith("game_");
            if (!isCasualRun || !gs) {
                setSettleConfirmOpen(false);
                postSettleLayoutFreezeRef.current = false;
                onGameSubmit?.();
                return;
            }
            const score = Math.max(0, Math.floor(gs.score ?? 0));
            // 保持「正在结算」直到明细就绪，再同帧切到「本局得分」，避免双遮罩卸层闪动
            void (async () => {
                try {
                    await beginCasualPostSettleFlow(
                        gs.gameId,
                        score,
                        {
                            tableSummary: extras?.tableSummary ?? undefined,
                            pendingOthers: extras?.pendingOthers,
                            ...(extras?.triathlonScoreReportOnly || extras?.deferTriathlonTableSummary
                                ? { deferTriathlonTableSummary: true }
                                : {}),
                            ...(typeof extras?.seedScoreThreshold === "number"
                                ? {
                                      seedScoreThreshold: extras.seedScoreThreshold,
                                      success: extras.success,
                                  }
                                : {}),
                        },
                        { holdUntilReady: true }
                    );
                } finally {
                    setSettleConfirmOpen(false);
                }
            })();
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
                      const nextGs = applyServerProgress(syncReplayScore, gs, {
                          score: res.score,
                          moves: res.moves,
                          gameStatus: res.gameStatus,
                      });
                      const score = Math.max(0, Math.floor(nextGs.score ?? 0));
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
                out.success =
                    typeof settled.success === "boolean"
                        ? settled.success
                        : Math.max(0, Math.floor(gs.score ?? 0)) >= settled.seedScoreThreshold;
            } else if (typeof targetScore === "number" && Number.isFinite(targetScore)) {
                const score = Math.max(0, Math.floor(gs.score ?? 0));
                out.seedScoreThreshold = targetScore;
                out.success = score >= targetScore;
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
    }, [convex, casualTournamentId, casualPlatformAuthed, runSolitaireSettlement, runForceEndCasualSettlement, targetScore]);

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
        // 必须用 ref：自动清盘循环会长时间持有旧的 callback 闭包
        const gs = gameStateRef.current;
        if (!gs || !card) return;
        if (isTerminalSoloStatus(gs.status)) return;
        if (!SoloGameEngine.planDrawCard(gs, card.id).ok) return;

        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        let serverSnap: ServerProgress = {};
        try {
            const result = (await convex.mutation(api.service.gameManager.draw, {
                gameId: gs.gameId,
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

            const baseGs = gameStateRef.current ?? gs;
            const drawnWithEle = updateCards.map((c) =>
                mergeServerFaceOntoDomCard(
                    baseGs.cards.find((gc) => gc.id === c.id),
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
                    data: { cards: drawnWithEle, boardDimensionRef, gameState: baseGs },
                    onComplete: () => resolve(),
                });
            });

            saveUpdate(updateCards);
            const nextGs = mergeCardPatches(
                applyServerProgress(syncReplayScore, baseGs, serverSnap),
                updateCards
            );
            gameStateRef.current = nextGs;
            void completeCasualSolitaireRun(nextGs);
        } catch (e) {
            console.error("drawCard failed:", e);
        } finally {
            setInteractionPhase(GameInteractionPhase.idle);
        }
    }, [
        boardDimensionRef,
        convex,
        saveUpdate,
        syncReplayScore,
        setInteractionPhase,
        completeCasualSolitaireRun,
    ]);

    const moveCard = useCallback(async (data: SoloActionData): Promise<boolean> => {
        const { card, dropTarget, autoFoundationMove } = data;
        // 必须用 ref：自动清盘循环持有的 moveCard 闭包里的 gameState 会停在触发瞬间
        const gs = gameStateRef.current;
        if (!gs || !card || !dropTarget) return false;
        if (isTerminalSoloStatus(gs.status)) return false;

        const liveCard =
            (gs.cards.find((c) => c.id === card.id) as SoloCard | undefined) ?? (card as SoloCard);
        const plan = SoloGameEngine.planMoveCard(gs, liveCard as Card, dropTarget.zoneId);
        if (!plan.ok) {
            console.log("moveCard failed", plan);
            return false;
        }

        const moveData = attachMovePlanEle(gs, (plan.data?.move ?? []) as SoloCard[]);
        const pendingFlipId = plan.data?.flip?.[0]?.id;
        const flipDuration = autoFoundationMove
            ? SOLO_ANIMATION_CONFIG.duration.flip.autoFoundation
            : SOLO_ANIMATION_CONFIG.duration.flip.normal;

        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        let serverSnap: ServerProgress = {};
        let flipSession: FlipGenericSession | null = null;

        if (pendingFlipId) {
            const flipDom = gs.cards.find((c: SoloCard) => c.id === pendingFlipId);
            if (flipDom) {
                flipSession = startFlipGeneric({ card: flipDom, duration: flipDuration });
            }
        }

        try {
            const mutationPromise = convex
                .mutation(api.service.gameManager.move, {
                    gameId: gs.gameId,
                    cardId: liveCard.id,
                    toZone: dropTarget.zoneId,
                })
                .then((result: ActionResult & ServerProgress) => {
                    if (!result.ok || !result.data?.move?.length) {
                        console.warn("[Solitaire] move rejected", {
                          error: result.error,
                          cardId: liveCard.id,
                          toZone: dropTarget.zoneId,
                          gameId: gs.gameId,
                          moves: gs.moves,
                          status: gs.status,
                          result,
                        });
                        throw new Error(result.error ? `move_failed:${result.error}` : "move_failed");
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
                        gameState: gs,
                        moveCards: moveData,
                        targetZoneId: dropTarget.zoneId,
                        autoFoundationMove,
                    },
                    onComplete: () => resolve(),
                });
            });

            const result = await Promise.all([mutationPromise, movePromise]).then(([r]) => r);
            const baseGs = gameStateRef.current ?? gs;

            const serverFlip = result.data?.flip?.[0] as SoloCard | undefined;
            if (serverFlip?.rank && serverFlip?.suit) {
                const faceCard = mergeServerFaceOntoDomCard(
                    baseGs.cards.find((c: SoloCard) => c.id === serverFlip.id),
                    serverFlip
                );
                await new Promise<void>((resolve) => {
                    if (flipSession && faceCard.ele) {
                        flipSession.completeReveal(faceCard, resolve);
                    } else if (faceCard.ele) {
                        PlayEffects.flipCard({
                            data: {
                                card: faceCard,
                                gameState: baseGs,
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
            let nextGs = mergeCardPatches(
                applyServerProgress(syncReplayScore, baseGs, serverSnap),
                updateCards
            );
            // 服务端误标 COMPLETED 时保持可玩，避免 idle 后误触发 auto-complete
            if (
                isTerminalSoloStatus(nextGs.status) &&
                !isAllCardsOnFoundation(nextGs)
            ) {
                nextGs = { ...nextGs, status: SoloGameStatus.PLAYING };
                console.warn(
                    "[Solitaire] COMPLETED but board not clear — keep PLAYING, skip victory/settle"
                );
            }
            gameStateRef.current = nextGs;
            syncCardStackZIndexFromGameState(nextGs);
            if (isAllCardsOnFoundation(nextGs)) {
                await finishWinWithVictoryEffect({
                    ...nextGs,
                    status: SoloGameStatus.COMPLETED,
                });
                return true;
            }
            void completeCasualSolitaireRun(nextGs);
            return true;
        } catch (e) {
            console.error("moveCard failed:", e);
            if (flipSession) {
                await new Promise<void>((resolve) => flipSession!.cancel(resolve));
            }
            return false;
        } finally {
            setInteractionPhase(GameInteractionPhase.idle);
        }
    }, [
        boardDimensionRef,
        convex,
        saveUpdate,
        syncReplayScore,
        setInteractionPhase,
        completeCasualSolitaireRun,
        finishWinWithVictoryEffect,
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
                    applyServerProgress(syncReplayScore, gameState, serverSnap);
                    setInteractionPhase(GameInteractionPhase.idle);
                    resolve();
                },
            });
        });
        await Promise.all([recyclePromise, playPromise]);
        setInteractionPhase(GameInteractionPhase.idle);
        return;
    }, [gameState, boardDimensionRef, convex, saveUpdate, syncReplayScore, setInteractionPhase]);
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
        if (!config.autoComplete) return;
        if (autoCompleteRunningRef.current) return;
        let gs = gameStateRef.current;
        if (!gs || isTerminalSoloStatus(gs.status)) return;
        const lockId = gs.gameId;
        if (!lockId || autoCompleteGameLocks.has(lockId)) return;
        if (!gs.zones?.length) {
            gs = { ...gs, zones: createZones() };
            gameStateRef.current = gs;
        }
        if (!SoloGameEngine.canAutoCompleteWithFoundationOnly(gs)) return;

        console.info("[Solitaire] auto-complete v2 (local-first)");
        autoCompleteRunningRef.current = true;
        autoCompleteGameLocks.add(lockId);
        holdGameStateRefSync.current = true;
        autoCompleteLayoutGate.blocked = true;
        setInteractionPhase(GameInteractionPhase.animating);

        const sleepMs = (ms: number) =>
            new Promise<void>((resolve) => {
                window.setTimeout(resolve, ms);
            });

        /** 仅启动飞行；不等待结束，便于下一张交错起飞 */
        const startFoundationFlight = (
            state: SoloGameState,
            moveCards: SoloCard[],
            targetZoneId: string
        ): Promise<void> =>
            new Promise<void>((resolve) => {
                PlayEffects.moveCard({
                    data: {
                        boardDimensionRef,
                        gameState: state,
                        moveCards: attachMovePlanEle(state, moveCards),
                        targetZoneId,
                        autoFoundationMove: true,
                    },
                    onComplete: () => resolve(),
                });
            });

        const playFlipAsync = (state: SoloGameState, serverFlip: SoloCard) => {
            if (!serverFlip.rank || !serverFlip.suit) return;
            const faceCard = mergeServerFaceOntoDomCard(
                state.cards.find((c) => c.id === serverFlip.id),
                serverFlip
            );
            if (!faceCard.ele) return;
            PlayEffects.flipCard({
                data: {
                    card: faceCard,
                    gameState: state,
                    duration: SOLO_ANIMATION_CONFIG.duration.flip.autoFoundation,
                },
            });
        };

        const logDrainBlocker = (cur: SoloGameState) => {
            const tops = [0, 1, 2, 3, 4, 5, 6].map((col) => {
                const top = cur.cards
                    .filter((c) => c.zoneId === `tableau-${col}`)
                    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
                return top
                    ? `${col}:${top.rank ?? "?"}${top.suit?.[0] ?? "?"}(rev=${top.isRevealed ? 1 : 0})`
                    : `${col}:-`;
            });
            const foundations = ["hearts", "diamonds", "clubs", "spades"].map((suit) => {
                const pile = cur.cards
                    .filter((c) => c.zoneId === `foundation-${suit}`)
                    .sort((a, b) => a.zoneIndex - b.zoneIndex);
                const top = pile[pile.length - 1];
                return `${suit}:${pile.length}:${top?.rank ?? "?"}`;
            });
            console.warn("[Solitaire] local drain blocked", { tops, foundations });
        };

        const staggerMs = Math.max(
            16,
            Math.round(
                (SOLO_ANIMATION_CONFIG.duration.move.autoFoundationStagger ?? 0.055) * 1000
            )
        );
        let serverChain: Promise<void> = Promise.resolve();
        const enqueueServer = (task: () => Promise<void>) => {
            serverChain = serverChain.then(task).catch((e) => {
                console.warn("[Solitaire] auto-complete server queue", e);
            });
        };

        try {
            // 本地规划为主：起飞 → 立刻推进本地状态 → 后台串行 sync 服务端
            // 只等待 stagger，多牌同时在空中，避免「一顿一顿」。
            for (let step = 0; step < 60; step++) {
                gs = gameStateRef.current;
                if (!gs) break;
                if (!gs.zones?.length) {
                    gs = { ...gs, zones: createZones() };
                    gameStateRef.current = gs;
                }
                if (isAllCardsOnFoundation(gs)) {
                    // 模型收齐立即胜利；结算等后台 move 队列，避免 not_terminal
                    const wonGs = {
                        ...(gameStateRef.current ?? gs),
                        status: SoloGameStatus.COMPLETED,
                    };
                    gameStateRef.current = wonGs;
                    await finishWinWithVictoryEffect(wonGs, { beforeSettle: serverChain });
                    return;
                }

                const next = SoloGameEngine.findNextFoundationMove(gs);
                if (!next) {
                    logDrainBlocker(gs);
                    // 服务端可能已收齐而本地落后：再试一步服务端（含过早 COMPLETED heal）
                    try {
                        const result = (await convex.mutation(
                            api.service.gameManager.autoCompleteFoundationStep,
                            { gameId: gs.gameId }
                        )) as ActionResult & ServerProgress & { error?: string; done?: boolean };
                        if (result?.ok && result.data?.move?.length) {
                            const updateCards = [
                                ...(result.data.move as SoloCard[]),
                                ...((result.data.flip as SoloCard[] | undefined) ?? []),
                            ];
                            const moveCards = result.data.move as SoloCard[];
                            const targetZoneId = moveCards[0]!.zoneId;
                            const planState = gs;
                            void startFoundationFlight(planState, moveCards, targetZoneId);
                            let nextGs = mergeCardPatches(gs, updateCards);
                            const clear = isAllCardsOnFoundation(nextGs);
                            nextGs = {
                                ...nextGs,
                                ...(typeof result.score === "number"
                                    ? { score: result.score }
                                    : {}),
                                ...(typeof result.moves === "number"
                                    ? { moves: result.moves }
                                    : {}),
                                status: clear
                                    ? SoloGameStatus.COMPLETED
                                    : SoloGameStatus.PLAYING,
                            };
                            gameStateRef.current = nextGs;
                            const flip0 = result.data?.flip?.[0] as SoloCard | undefined;
                            if (flip0) playFlipAsync(nextGs, flip0);
                            if (clear) {
                                await finishWinWithVictoryEffect(nextGs, {
                                    beforeSettle: serverChain,
                                });
                                return;
                            }
                            await sleepMs(staggerMs);
                            continue;
                        }
                    } catch (e) {
                        console.warn("[Solitaire] autoCompleteFoundationStep fallback", e);
                    }
                    break;
                }

                const live = gs.cards.find((c) => c.id === next.card.id) ?? next.card;
                const plan = SoloGameEngine.planMoveCard(gs, live as Card, next.toZoneId);
                if (!plan.ok || !plan.data?.move?.length) {
                    console.warn("[Solitaire] auto-complete planMoveCard failed", {
                        card: `${live.rank}${live.suit}`,
                        to: next.toZoneId,
                        zones: gs.zones?.length ?? 0,
                    });
                    logDrainBlocker(gs);
                    break;
                }

                const moveCards = plan.data.move as SoloCard[];
                const targetZoneId = next.toZoneId;
                const planState = gs;

                // 清盘过程中不要 syncReplayState：会按 zoneIndex 重排 DOM，冲掉飞行。
                void startFoundationFlight(planState, moveCards, targetZoneId);

                let nextGs = mergeCardPatches(gs, moveCards);
                nextGs = { ...nextGs, status: SoloGameStatus.PLAYING };
                gameStateRef.current = nextGs;

                const cardId = live.id;
                const gameId = gs.gameId;
                enqueueServer(async () => {
                    const result = (await convex.mutation(api.service.gameManager.move, {
                        gameId,
                        cardId,
                        toZone: targetZoneId,
                    })) as ActionResult &
                        ServerProgress & { error?: string; idempotent?: boolean };
                    if (!result?.ok) {
                        if (result?.error !== "terminal") {
                            console.warn(
                                "[Solitaire] auto-complete server move skipped",
                                result?.error ?? "rejected",
                                `${live.rank ?? "?"}${live.suit?.[0] ?? "?"}→${targetZoneId}`
                            );
                        }
                        return;
                    }
                    let cur = gameStateRef.current;
                    if (!cur) return;
                    const flip = result.data?.flip as SoloCard[] | undefined;
                    if (flip?.length) {
                        cur = mergeCardPatches(cur, flip);
                        for (const f of flip) {
                            playFlipAsync(cur, f);
                        }
                    }
                    const clear = isAllCardsOnFoundation(cur);
                    // 清盘中不要 syncReplayScore：会把 React 打成 PLAYING+旧牌面，胜利动画背景刷回 tableau
                    cur = {
                        ...cur,
                        ...(typeof result.score === "number" ? { score: result.score } : {}),
                        ...(typeof result.moves === "number" ? { moves: result.moves } : {}),
                        status: clear ? SoloGameStatus.COMPLETED : SoloGameStatus.PLAYING,
                    };
                    gameStateRef.current = cur;
                });

                // 最后一张入模后立刻胜利（吸附未飞完的牌），不等 stagger
                if (isAllCardsOnFoundation(nextGs)) {
                    const wonGs = { ...nextGs, status: SoloGameStatus.COMPLETED };
                    gameStateRef.current = wonGs;
                    await finishWinWithVictoryEffect(wonGs, { beforeSettle: serverChain });
                    return;
                }

                await sleepMs(staggerMs);
            }

            const finalGs = gameStateRef.current;
            if (finalGs && isAllCardsOnFoundation(finalGs)) {
                const wonGs = { ...finalGs, status: SoloGameStatus.COMPLETED };
                gameStateRef.current = wonGs;
                await finishWinWithVictoryEffect(wonGs, { beforeSettle: serverChain });
                return;
            }
            if (finalGs) {
                console.warn(
                    "[Solitaire] auto-complete ended with leftover cards",
                    finalGs.cards
                        .filter(
                            (c) =>
                                c.zone !== ZoneType.FOUNDATION &&
                                !String(c.zoneId ?? "").startsWith("foundation-")
                        )
                        .map((c) => `${c.rank}${c.suit?.[0]}:${c.zoneId}`)
                );
            }
            await serverChain;
        } finally {
            const snap = gameStateRef.current;
            const won =
                Boolean(snap) &&
                (isAllCardsOnFoundation(snap!) ||
                    isTerminalSoloStatus(snap!.status));
            // 必须在解除 layout 锁 / 切 idle 之前把权威牌面刷进 React
            if (snap) {
                flushSync(() => {
                    syncReplayState(
                        won ? { ...snap, status: SoloGameStatus.COMPLETED } : snap
                    );
                });
            }
            autoCompleteRunningRef.current = false;
            autoCompleteGameLocks.delete(lockId);
            holdGameStateRefSync.current = false;
            // 胜利路径由 finishWin 在去掉 data-solo-victory 后再解锁；此处勿提前放开
            if (!won) {
                autoCompleteLayoutGate.blocked = false;
            }
            setInteractionPhase(GameInteractionPhase.idle);
        }
    }, [
        config.autoComplete,
        convex,
        boardDimensionRef,
        syncReplayState,
        setInteractionPhase,
        finishWinWithVictoryEffect,
    ]);

    useEffect(() => {
        if (!config.autoComplete) return;
        if (interactionPhase !== GameInteractionPhase.idle) return;
        if (casualRunSubmittedRef.current) return;
        if (autoCompleteRunningRef.current) return;
        // 优先 ref：Ctrl+Shift+A 后 React state 可能尚未追上
        const gs = gameStateRef.current ?? gameState;
        if (!gs) return;
        if (isTerminalSoloStatus(gs.status)) return;
        if (!SoloGameEngine.canAutoCompleteWithFoundationOnly(gs)) return;
        void runAutoCompleteToFoundation();
    }, [gameState, interactionPhase, config.autoComplete, runAutoCompleteToFoundation]);

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
        postCasualReplayMode,
        postCasualReplayWindowEndsAt,
        postCasualAdReplayDailyRemaining,
        casualReplayBusy,
        casualReplayError,
        replayCasualRun,
        dismissPostCasualSummary,
        watchTarget,
        watchTargetLabel,
        openWatch,
        closeWatch,
        openSelfReplay,
        completeCasualSolitaireRunOnTimeout,
        postSettleLayoutFreezeRef,
    };
};

export default useActHandler;
