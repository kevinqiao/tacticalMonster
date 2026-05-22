import { SoloGameEngine } from "@/convex/solitaireArena/convex/service/SoloGameEngine";
import { useCasualPlatform } from "component/lobby/casual/service/useCasualPlatformManager";
import { useUserManager } from "host/service/UserManager";
import { useConvex } from "convex/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../../../../../convex/solitaireArena/convex/_generated/api";
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
import { getCardCoord, syncCardStackZIndexFromGameState, tableauCardZIndex } from "../../Utils";
import { useSoloGameManager } from "../GameManager";
import { CasualGameScoreReportOverlay } from "../../../../shared/CasualGameScoreReportOverlay";
import {
    buildSolitaireScoreReport,
    shouldOpenCasualTableSummaryAfterScoreReport,
    type CasualGameScoreReportUI,
} from "../../../../shared/casualGameScoreReportUI";
import type { CasualAsyncTableSummaryUI, ManualSettleConfirmExtras } from "../../../../shared/casualAsyncTableSummaryUI";
import type { GameReport } from "../../types/SoloTypes";

type ServerProgress = { score?: number; moves?: number; gameStatus?: number };

type CasualRunSubmitOutcome =
    | {
          ok: true;
          tableSummary?: CasualAsyncTableSummaryUI;
          pendingOthers?: boolean;
          replayOffered?: boolean;
          replayTokenCount?: number;
          canReplay?: boolean;
      }
    | { ok: false };

function mergeServerProgress(gs: SoloGameState, p: ServerProgress) {
    if (typeof p.score === "number") gs.score = p.score;
    if (typeof p.moves === "number") gs.moves = p.moves;
    if (typeof p.gameStatus === "number") gs.status = p.gameStatus;
}

function isTerminalSoloStatus(status: SoloGameStatus | number | undefined): boolean {
    const n = Number(status);
    return n === SoloGameStatus.COMPLETED || n === SoloGameStatus.CANCELLED;
}

const useActHandler = () => {
    const convex = useConvex();
    const casual = useCasualPlatform();
    const { user } = useUserManager();
    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
    const [postCasualScoreReportOpen, setPostCasualScoreReportOpen] = useState(false);
    const [postCasualScoreReport, setPostCasualScoreReport] = useState<CasualGameScoreReportUI | null>(null);
    const [postCasualSummaryOpen, setPostCasualSummaryOpen] = useState(false);
    const [postCasualTableSummary, setPostCasualTableSummary] = useState<CasualAsyncTableSummaryUI | null>(
        null
    );
    const [postCasualWaitingForPeers, setPostCasualWaitingForPeers] = useState(false);
    const [postCasualCanReplay, setPostCasualCanReplay] = useState(false);
    const [postCasualReplayOffered, setPostCasualReplayOffered] = useState(false);
    const [postCasualReplayTokenCount, setPostCasualReplayTokenCount] = useState(0);
    const [casualReplayBusy, setCasualReplayBusy] = useState(false);
    const casualRunSubmittedRef = useRef(false);
    const settleInFlightRef = useRef(false);
    const gameStateRef = useRef<SoloGameState | null>(null);
    const interactionPhaseRef = useRef<GameInteractionPhase>(GameInteractionPhase.idle);
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
        reloadCasualRun,
    } = useSoloGameManager();

    useEffect(() => {
        gameStateRef.current = gameState ?? null;
    }, [gameState]);

    useEffect(() => {
        interactionPhaseRef.current = interactionPhase;
    }, [interactionPhase]);

    useEffect(() => {
        casualRunSubmittedRef.current = false;
        setPostCasualScoreReportOpen(false);
        setPostCasualScoreReport(null);
        setPostCasualSummaryOpen(false);
        setPostCasualTableSummary(null);
        setPostCasualWaitingForPeers(false);
        setPostCasualCanReplay(false);
        setCasualReplayBusy(false);
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
                replayOffered?: boolean;
                replayTokenCount?: number;
                canReplay?: boolean;
            }
        ) => {
            const report = await loadSolitaireScoreReport(gameId, fallbackScore);
            setPostCasualScoreReport(report);
            setPostCasualTableSummary(settle.tableSummary ?? null);
            setPostCasualWaitingForPeers(Boolean(settle.pendingOthers));
            const offered = Boolean(settle.replayOffered ?? settle.canReplay);
            setPostCasualReplayOffered(offered);
            setPostCasualReplayTokenCount(
                typeof settle.replayTokenCount === "number" ? settle.replayTokenCount : 0
            );
            setPostCasualCanReplay(Boolean(settle.canReplay));
            if (import.meta.env.DEV) {
                console.log("[Solitaire] post-settle replay", {
                    replayOffered: offered,
                    replayTokenCount: settle.replayTokenCount,
                    canReplay: settle.canReplay,
                    pendingOthers: settle.pendingOthers,
                });
            }
            setPostCasualScoreReportOpen(true);
        },
        [loadSolitaireScoreReport]
    );

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
                    user?.token
                ) {
                    const cr = (await convex.action(api.proxy.controller.submitCasualPlatformRun, {
                        token: user.token,
                        gameId: gs.gameId,
                    })) as {
                        ok?: boolean;
                        error?: string;
                        tableSummary?: CasualAsyncTableSummaryUI;
                        pendingOthers?: boolean;
                        replayOffered?: boolean;
                        replayTokenCount?: number;
                        canReplay?: boolean;
                    };
                    if (!cr.ok) {
                        console.warn("[Solitaire] submitCasualPlatformRun", cr.error);
                        casualRunSubmittedRef.current = false;
                        return { ok: false };
                    }
                    if (!deferHost) {
                        onGameSubmit?.();
                    }
                    return {
                        ok: true,
                        ...(cr.tableSummary ? { tableSummary: cr.tableSummary } : {}),
                        ...(cr.pendingOthers ? { pendingOthers: true } : {}),
                        ...(cr.replayOffered ? { replayOffered: true } : {}),
                        ...(cr.replayTokenCount != null ? { replayTokenCount: cr.replayTokenCount } : {}),
                        ...(cr.canReplay ? { canReplay: true } : {}),
                    };
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
                    return { ok: false };
                }
                if (!deferHost) {
                    onGameSubmit?.();
                }
                return { ok: true };
            } catch (e) {
                console.error("[Solitaire] runSolitaireSettlement", e);
                casualRunSubmittedRef.current = false;
                return { ok: false };
            }
        },
        [convex, casualTournamentId, user?.token, onGameSubmit]
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
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            onGameSubmit?.();
        },
        [casual, casualTournamentId, user?.uid, onGameSubmit]
    );

    const dismissPostCasualScoreReport = useCallback(() => {
        const hadReplayOffer = postCasualReplayOffered;
        setPostCasualScoreReportOpen(false);
        setPostCasualScoreReport(null);
        if (
            shouldOpenCasualTableSummaryAfterScoreReport(
                casualTournamentId,
                postCasualTableSummary,
                postCasualWaitingForPeers
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
        exitCasualRunAfterSettle,
    ]);

    const dismissPostCasualSummary = useCallback(() => {
        void exitCasualRunAfterSettle({ hadReplayOffer: postCasualReplayOffered });
    }, [postCasualReplayOffered, exitCasualRunAfterSettle]);

    const replayCasualRun = useCallback(async () => {
        const gs = gameStateRef.current;
        if (!gs || !user?.token || casualReplayBusy) return;
        if (typeof gs.gameId !== "string" || !gs.gameId.startsWith("game_")) return;
        setCasualReplayBusy(true);
        try {
            const rr = (await convex.action(api.proxy.controller.replayCasualRun, {
                token: user.token,
                gameId: gs.gameId,
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
            setPostCasualScoreReportOpen(false);
            setPostCasualScoreReport(null);
            await reloadCasualRun();
        } catch (e) {
            console.error("[Solitaire] replayCasualRun", e);
        } finally {
            setCasualReplayBusy(false);
        }
    }, [convex, user?.token, casualReplayBusy, reloadCasualRun]);

    const cancelSettleConfirm = useCallback(() => {
        setSettleConfirmOpen(false);
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
                replayOffered: extras?.replayOffered,
                replayTokenCount: extras?.replayTokenCount,
                canReplay: extras?.canReplay,
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
            const settled = await runSolitaireSettlement(score, { deferHostNotify: true });
            if (!settled.ok) {
                throw new Error("结算提交失败，请重试");
            }
            const out: ManualSettleConfirmExtras = {};
            if (settled.tableSummary) out.tableSummary = settled.tableSummary;
            if (settled.pendingOthers) out.pendingOthers = true;
            if (settled.replayOffered) out.replayOffered = true;
            if (settled.replayTokenCount != null) out.replayTokenCount = settled.replayTokenCount;
            if (settled.canReplay) out.canReplay = true;
            return out;
        } catch (e) {
            console.error("[Solitaire] confirmSettleAndExit", e);
            if (e instanceof Error) throw e;
            throw new Error("结算失败，请稍后重试");
        } finally {
            settleInFlightRef.current = false;
        }
    }, [convex, runSolitaireSettlement]);

    const settleManuallyAndExit = useCallback(async () => {
        if (!gameState || casualRunSubmittedRef.current || settleInFlightRef.current) return;
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
                const score = Math.max(0, Math.floor(gameState.score ?? 0));
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
    ]);
    const saveUpdate = useCallback((cards: Card[]) => {
        if (!gameState) return;
        cards.forEach((r: SoloCard) => {
            const card = gameState.cards.find((c: SoloCard) => c.id === r.id);
            if (card) {
                card.isRevealed = r.isRevealed;
                card.zone = r.zone;
                card.zoneId = r.zoneId;
                card.zoneIndex = r.zoneIndex;
            }
        });

    }, [gameState]);

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
        const drawResult = SoloGameEngine.drawCard(gameState, card.id);
        const drawedCard = drawResult.data?.draw?.[0];
        if (!drawedCard) return;

        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        let serverSnap: ServerProgress = {};
        try {
            const drawPromise = new Promise<void>((resolve, reject) => {
                convex
                    .mutation(api.service.gameManager.draw, { gameId: gameState.gameId, cardId: card.id })
                    .then((result: ActionResult & ServerProgress) => {
                        if (result.ok && result.data?.draw && result.data.draw.length > 0) {
                            const revealedCard = result.data.draw[0] as SoloCard;
                            updateCards.push(...result.data.draw);
                            serverSnap = {
                                score: result.score,
                                moves: result.moves,
                                gameStatus: result.gameStatus,
                            };
                            PlayEffects.popCard({
                                data: { card: revealedCard, gameState },
                                onComplete: () => {
                                    resolve();
                                },
                            });
                        } else {
                            reject();
                        }
                    })
                    .catch((error) => {
                        console.error("draw mutation failed:", error);
                        reject();
                    });
            });
            const playPromise = new Promise<void>((resolve) => {
                PlayEffects.drawCard({
                    data: { card: drawedCard as SoloCard, boardDimensionRef, gameState },
                    onComplete: () => {
                        resolve();
                    },
                });
            });
            await Promise.all([drawPromise, playPromise]);
            saveUpdate(updateCards);
            mergeServerProgress(gameState, serverSnap);
            void completeCasualSolitaireRun();
        } catch (e) {
            console.error("drawCard failed:", e);
        } finally {
            //rollback to the previous state
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

        const result = SoloGameEngine.moveCard(gameState, card as Card, dropTarget.zoneId);

        if (!result.ok) {
            console.log("moveCard failed", result);
            return;
        }
        const moveData = result.data?.move || [];
        setInteractionPhase(GameInteractionPhase.animating);
        let updateCards: SoloCard[] = [];
        let serverSnap: ServerProgress = {};
        try {
            const movePromise = new Promise<void>((resolve, reject) => {
                convex
                    .mutation(api.service.gameManager.move, {
                        gameId: gameState.gameId,
                        cardId: card.id,
                        toZone: dropTarget.zoneId,
                    })
                    .then((result: ActionResult & ServerProgress) => {
                        console.log("move result", result);
                        if (result.ok && result.data?.move && result.data.move.length > 0) {
                            updateCards.push(...result.data.move);
                            serverSnap = {
                                score: result.score,
                                moves: result.moves,
                                gameStatus: result.gameStatus,
                            };
                            if (result.data.flip && result.data.flip.length > 0) {
                                updateCards.push(...result.data.flip);
                                const flipPayload = result.data.flip[0] as SoloCard;
                                const domCard = gameState.cards.find((c: SoloCard) => c.id === flipPayload.id);
                                if (domCard?.ele) {
                                    flipPayload.ele = domCard.ele;
                                }
                                if (flipPayload.ele) {
                                    PlayEffects.flipCard({
                                        data: {
                                            card: flipPayload,
                                            gameState,
                                            ...(autoFoundationMove
                                                ? { duration: SOLO_ANIMATION_CONFIG.duration.flip.autoFoundation }
                                                : {}),
                                        },
                                        onComplete: () => {
                                            resolve();
                                        },
                                    });
                                } else {
                                    resolve();
                                }
                            } else {
                                resolve();
                            }
                        } else reject();
                    })
                    .catch((error) => {
                        console.error("move card failed:", error);
                        reject();
                    });
            });

            const playPromise = new Promise<void>((resolve) => {
                PlayEffects.moveCard({
                    data: {
                        boardDimensionRef,
                        gameState,
                        moveCards: moveData,
                        targetZoneId: dropTarget.zoneId,
                    },
                    onComplete: () => {
                        resolve();
                    },
                });
            });

            await Promise.all([movePromise, playPromise]);
            saveUpdate(updateCards);
            mergeServerProgress(gameState, serverSnap);
            void completeCasualSolitaireRun();
        } catch (e) {
            console.error("moveCard failed:", e);
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
                const z =
                    c.zone === ZoneType.TABLEAU
                        ? tableauCardZIndex(c.zoneId, c.zoneIndex)
                        : c.zoneIndex + 10;
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
        postCasualWaitingForPeers,
        postCasualCanReplay,
        postCasualReplayOffered,
        postCasualReplayTokenCount,
        casualReplayBusy,
        replayCasualRun,
        dismissPostCasualSummary,
    };
};

export default useActHandler;
