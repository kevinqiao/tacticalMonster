/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { useConvex } from 'convex/react';
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../../../../convex/solitaireArena/convex/_generated/api';
import {
    Card,
    DEFAULT_GAME_CONFIG,
    GameInteractionPhase,
    SolitaireRule,
    SoloBoardDimension,
    SoloCard,
    SoloGameConfig,
    SoloGameState,
    SoloGameStatus,
    ZoneType,
} from '../types/SoloTypes';
import { AudioBus } from 'host/service/audio';
import { dealEffect } from '../animation/effects/dealEffect';
import { createRolloutReplayState } from '../replay/solitaireRolloutReplay';
import { autoCompleteLayoutGate } from '../autoCompleteLayoutGate';
import { layoutAllSoloCardsFromModel } from '../soloCardLayout';
import SoloRuleManager from './SoloRuleManager';
import { createZones } from '@/convex/solitaireArena/convex/service/SoloGameEngine';

type OpeningDealEvent = { name: string; cards: Card[] };

/**
 * Opening deal when board is fresh (OPEN/DEALED, no moves yet).
 * `loadGame` often returns existing rows with `events: []` — synthesize from tableau.
 */
function resolveOpeningDealEvent(
    game: SoloGameState,
    events?: Array<{ name?: string; cards?: Card[] }>
): OpeningDealEvent | null {
    const st = Number(game.status);
    // PLAYING with 0 moves can still be a fresh board (status advanced without a scored op).
    if (
        st !== SoloGameStatus.OPEN &&
        st !== SoloGameStatus.DEALED &&
        st !== SoloGameStatus.PLAYING
    ) {
        return null;
    }
    if ((game.moves ?? 0) > 0) return null;
    if (typeof game.playStartedAt === 'number' && Number.isFinite(game.playStartedAt)) {
        return null;
    }

    const fromServer = events?.find((e) => e.name === 'deal' && (e.cards?.length ?? 0) > 0);
    if (fromServer?.cards?.length) {
        return { name: 'deal', cards: fromServer.cards };
    }

    const tableau = game.cards.filter(
        (c) =>
            c.zone === ZoneType.TABLEAU ||
            String(c.zoneId ?? '').startsWith('tableau-')
    );
    if (tableau.length === 0) return null;

    return {
        name: 'deal',
        cards: tableau.map((c) => {
            const patch: Card = {
                id: c.id,
                zone: c.zone,
                zoneId: c.zoneId,
                zoneIndex: c.zoneIndex,
                isRevealed: Boolean(c.isRevealed),
            };
            if (c.isRevealed) {
                if (c.suit != null) patch.suit = c.suit;
                if (c.rank != null) patch.rank = c.rank;
                if (c.value != null) patch.value = c.value;
                if (c.isRed != null) patch.isRed = c.isRed;
            }
            return patch;
        }),
    };
}

function applyDealPatchesToGame(
    prev: SoloGameState,
    dealCards: Card[]
): SoloGameState {
    const byId = new Map(dealCards.map((r) => [r.id, r]));
    const cards = prev.cards.map((c: SoloCard) => {
        const r = byId.get(c.id);
        if (!r) return c;
        const next: SoloCard = {
            ...c,
            isRevealed: r.isRevealed,
            zone: r.zone,
            zoneId: r.zoneId,
            zoneIndex: r.zoneIndex,
        };
        if (r.isRevealed && r.rank != null) next.rank = r.rank;
        if (r.isRevealed && r.suit != null) next.suit = r.suit;
        if (r.isRevealed && r.value != null) next.value = r.value;
        if (r.isRevealed && r.isRed != null) next.isRed = r.isRed;
        return next;
    });
    return { ...prev, status: SoloGameStatus.DEALED, cards };
}

export type SoloScoreFloat = {
    id: number;
    delta: number;
    /** 落点 zoneId；缺省则居中偏上 */
    anchorZoneId?: string;
};

const DIM_EPS = 0.75;

function near(a: number, b: number, eps = DIM_EPS): boolean {
    return Math.abs(a - b) <= eps;
}

function zoneNear(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
): boolean {
    return near(a.x, b.x) && near(a.y, b.y) && near(a.width, b.width) && near(a.height, b.height);
}

/** 测量结果与上次实质相同则视为未变（忽略亚像素抖动） */
function soloBoardDimensionNearlyEqual(a: SoloBoardDimension, b: SoloBoardDimension): boolean {
    if (a.cardWidth !== b.cardWidth || a.cardHeight !== b.cardHeight || a.spacing !== b.spacing) {
        return false;
    }
    if (!near(a.width, b.width) || !near(a.height, b.height)) return false;
    if (!near(a.left, b.left) || !near(a.top, b.top)) return false;
    for (let i = 0; i < 4; i++) {
        if (!near(a.foundationColX[i]!, b.foundationColX[i]!)) return false;
    }
    for (let i = 0; i < 7; i++) {
        if (!near(a.tableauColX[i]!, b.tableauColX[i]!)) return false;
    }
    return (
        zoneNear(a.zones.foundations, b.zones.foundations) &&
        zoneNear(a.zones.talon, b.zones.talon) &&
        zoneNear(a.zones.waste, b.zones.waste) &&
        zoneNear(a.zones.tableau, b.zones.tableau)
    );
}

interface ISoloGameContext {
    gameState: SoloGameState | null;
    boardDimension: SoloBoardDimension | null;
    boardDimensionRef: RefObject<SoloBoardDimension | null>;
    config: SoloGameConfig;
    ruleManager: SolitaireRule | null;
    interactionPhase: GameInteractionPhase;
    setInteractionPhase: (phase: GameInteractionPhase) => void;
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
    loadGame: () => void;
    /** 平台 authorize 后同 gameId 清档重开 */
    reloadCasualRun: () => Promise<boolean>;
    /** Skip in-progress opening deal (tap-to-skip). */
    skipOpeningDeal: () => void;
    /** True while the short opening deal timeline is running. */
    openingDealActive: boolean;
    /** 动画回放：合并卡牌 patch 并触发重渲染 */
    saveUpdate: (cards: SoloCard[]) => void;
    /** 动画回放：将模拟状态完整同步到 live 棋盘（含 score/moves） */
    syncReplayState: (source: SoloGameState) => void;
    /** 动画回放：仅同步 score/moves/status，不触发布局重排；可选在落点区飘分 */
    syncReplayScore: (
        source: SoloGameState,
        opts?: { anchorZoneId?: string }
    ) => void;
    /** 在指定 zone 上显示加减分飘字（清盘等不走 syncReplayScore 的路径） */
    pushScoreFloat: (delta: number, anchorZoneId?: string) => void;
    scoreFloats: SoloScoreFloat[];
    replayMode: boolean;
    casualTournamentId?: string;
    /** P75 挑战等：本局 seed 分位目标分 */
    targetScore?: number;
    onGameSubmit?: () => void;
    onTriathlonNextGame?: import('component/battle/games/shared/casualTriathlonSubmitFlow').TriathlonMidSessionAdvanceHandler;
}

const SoloGameContext = createContext<ISoloGameContext>({
    gameState: null,
    boardDimension: null,
    boardDimensionRef: { current: null },
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    interactionPhase: GameInteractionPhase.idle,
    setInteractionPhase: () => { },
    updateBoardDimension: () => { },
    loadGame: () => { },
    reloadCasualRun: async () => false,
    skipOpeningDeal: () => { },
    openingDealActive: false,
    saveUpdate: () => { },
    syncReplayState: () => { },
    syncReplayScore: () => { },
    pushScoreFloat: () => { },
    scoreFloats: [],
    replayMode: false,
    casualTournamentId: undefined,
    targetScore: undefined,
    onGameSubmit: undefined,
    onTriathlonNextGame: undefined,
});

export const useSoloGameManager = () => {
    const context = useContext(SoloGameContext);
    if (!context) {
        throw new Error('useSoloGameManager must be used within a SoloGameProvider');
    }
    return context;
};

interface SoloGameProviderProps {
    children: ReactNode;
    gameId?: string;
    /** Rollout dev replay: local dealt state, skips Convex loadGame */
    replaySeedId?: string;
    casualTournamentId?: string;
    config?: Partial<SoloGameConfig>;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
    onTriathlonNextGame?: import('component/battle/games/shared/casualTriathlonSubmitFlow').TriathlonMidSessionAdvanceHandler;
}

export const SoloGameProvider: React.FC<SoloGameProviderProps> = ({
    children,
    gameId,
    replaySeedId,
    casualTournamentId,
    config: customConfig,
    onGameLoadComplete,
    onGameSubmit,
    onTriathlonNextGame,
}) => {
    const replayMode = Boolean(replaySeedId && !gameId);
    const [gameState, setGameState] = useState<SoloGameState | null>(() =>
        replaySeedId && !gameId ? createRolloutReplayState(replaySeedId) : null
    );
    const [dealEvent, setDealEvent] = useState<OpeningDealEvent | null>(null);
    const [openingDealActive, setOpeningDealActive] = useState(false);
    const [boardDimension, setBoardDimension] = useState<SoloBoardDimension | null>(null);
    const [interactionPhase, setInteractionPhase] = useState<GameInteractionPhase>(GameInteractionPhase.idle);
    const [targetScore, setTargetScore] = useState<number | undefined>(undefined);
    const [scoreFloats, setScoreFloats] = useState<SoloScoreFloat[]>([]);
    const scoreFloatIdRef = useRef(0);
    const boardDimensionRef = useRef<SoloBoardDimension | null>(null);
    const timelinesRef = useRef<{ [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }>({});
    const openingDealStartedRef = useRef(false);
    const dealEventRef = useRef(dealEvent);
    dealEventRef.current = dealEvent;
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const convex = useConvex();
    const casualPlatformBridge = casualTournamentId?.startsWith("portal_")
        ? ("portal" as const)
        : undefined;

    const ruleManager = useMemo(() => {
        if (!gameState) return null;
        return new SoloRuleManager(gameState, interactionPhase);
    }, [gameState, interactionPhase]);


    // 更新棋盘尺寸（尺寸未变则跳过 setState，避免 CSS 变量 → ResizeObserver → 测量死循环）
    const updateBoardDimension = useCallback((dimension: SoloBoardDimension) => {
        const prev = boardDimensionRef.current;
        if (prev && soloBoardDimensionNearlyEqual(prev, dimension)) {
            return;
        }
        Object.values(timelinesRef.current).forEach(tl => {
            if (tl.timeline.isActive()) {
                tl.timeline.invalidate();
            }
        });
        boardDimensionRef.current = dimension;
        setBoardDimension(dimension);
    }, [timelinesRef]);
    const loadGameOnce = async () => {
        try {
            return await convex.action(api.proxy.controller.loadGame, {
                gameId,
                ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
            });
        } catch (e) {
            console.error('[SoloGameProvider] loadGame action threw', e);
            return { ok: false as const, error: 'load_game_server_error' };
        }
    };

    const loadGame = useCallback(async () => {
        if (!gameId) {
            onGameLoadComplete?.();
            return;
        }
        const retryable = new Set([
            "seed_pending",
            "seed_unavailable",
            "casual_find_400",
            "create_failed",
            "load_game_server_error",
        ]);
        let res = await loadGameOnce();
        for (let attempt = 0; attempt < 8 && !res.ok && retryable.has((res as { error?: string }).error ?? ""); attempt++) {
            await new Promise((r) => window.setTimeout(r, 400 * (attempt + 1)));
            res = await loadGameOnce();
        }
        if (!res.ok) {
            console.error('[SoloGameProvider] loadGame failed', (res as { error?: string }).error, res);
            onGameLoadComplete?.();
            return;
        }
        const raw = res.game as SoloGameState & { actionStatus?: string };
        const { actionStatus: _drop, ...rest } = raw;
        const game = {
            ...rest,
            zones: rest.zones?.length ? rest.zones : createZones(),
        } as SoloGameState;
        const opening = resolveOpeningDealEvent(
            game,
            res.events as Array<{ name?: string; cards?: Card[] }> | undefined
        );
        openingDealStartedRef.current = false;
        if (opening) {
            setDealEvent(opening);
            setInteractionPhase(GameInteractionPhase.animating);
            setOpeningDealActive(true);
        } else {
            setDealEvent(null);
            setInteractionPhase(GameInteractionPhase.idle);
            setOpeningDealActive(false);
        }
        onGameLoadComplete?.();
        setGameState(game);
        const threshold = (res as { seedScoreThreshold?: number }).seedScoreThreshold;
        if (typeof threshold === "number" && Number.isFinite(threshold)) {
            setTargetScore(threshold);
        }
    }, [convex, gameId, onGameLoadComplete, casualPlatformBridge]);

    const reloadCasualRun = useCallback(async (): Promise<boolean> => {
        if (!gameId || !gameId.startsWith("game_")) return false;
        const res = await convex.action(api.proxy.controller.loadGame, {
            gameId,
            resetCasualRun: true,
            ...(casualPlatformBridge ? { platformBridge: casualPlatformBridge } : {}),
        });
        if (!res.ok) {
            console.error("[SoloGameProvider] reloadCasualRun failed", (res as { error?: string }).error);
            return false;
        }
        const raw = res.game as SoloGameState & { actionStatus?: string };
        const { actionStatus: _drop, ...rest } = raw;
        const game = {
            ...rest,
            zones: rest.zones?.length ? rest.zones : createZones(),
        } as SoloGameState;
        const opening = resolveOpeningDealEvent(
            game,
            res.events as Array<{ name?: string; cards?: Card[] }> | undefined
        );
        openingDealStartedRef.current = false;
        if (opening) {
            setDealEvent(opening);
            setInteractionPhase(GameInteractionPhase.animating);
            setOpeningDealActive(true);
        } else {
            setDealEvent(null);
            setInteractionPhase(GameInteractionPhase.idle);
            setOpeningDealActive(false);
        }
        setGameState(game);
        const threshold = (res as { seedScoreThreshold?: number }).seedScoreThreshold;
        if (typeof threshold === "number" && Number.isFinite(threshold)) {
            setTargetScore(threshold);
        }
        return true;
    }, [convex, gameId, casualPlatformBridge]);

    const finishOpeningDeal = useCallback(() => {
        openingDealStartedRef.current = false;
        setDealEvent(null);
        setOpeningDealActive(false);
        setInteractionPhase(GameInteractionPhase.idle);
    }, []);

    const skipOpeningDeal = useCallback(() => {
        if (!openingDealActive && !dealEventRef.current) return;
        const entry = timelinesRef.current.dealOpening;
        entry?.timeline?.kill();
        delete timelinesRef.current.dealOpening;
        const gs = gameState;
        const dim = boardDimensionRef.current ?? boardDimension;
        if (gs && dim) {
            const patches = dealEventRef.current?.cards;
            const next =
                patches && Number(gs.status) === SoloGameStatus.OPEN
                    ? applyDealPatchesToGame(gs, patches)
                    : gs;
            if (next !== gs) setGameState(next);
            layoutAllSoloCardsFromModel(next, dim, boardDimensionRef);
        }
        finishOpeningDeal();
    }, [openingDealActive, gameState, boardDimension, finishOpeningDeal]);

    const saveUpdate = useCallback((cards: SoloCard[]) => {
        setGameState((prev) => {
            if (!prev) return prev;
            const patchById = new Map(cards.map((c) => [c.id, c]));
            let changed = false;
            const nextCards = prev.cards.map((c) => {
                const r = patchById.get(c.id);
                if (!r) return c;
                const next: SoloCard = {
                    ...c,
                    isRevealed: r.isRevealed ?? c.isRevealed,
                    zone: r.zone ?? c.zone,
                    zoneId: r.zoneId ?? c.zoneId,
                    zoneIndex: r.zoneIndex ?? c.zoneIndex,
                };
                if (r.rank != null) next.rank = r.rank;
                if (r.suit != null) next.suit = r.suit;
                if (r.value != null) next.value = r.value;
                if (r.isRed != null) next.isRed = r.isRed;
                if (
                    c.isRevealed === next.isRevealed &&
                    c.zone === next.zone &&
                    c.zoneId === next.zoneId &&
                    c.zoneIndex === next.zoneIndex &&
                    c.rank === next.rank &&
                    c.suit === next.suit &&
                    c.value === next.value &&
                    c.isRed === next.isRed
                ) {
                    return c;
                }
                changed = true;
                return next;
            });
            if (!changed) return prev;
            return { ...prev, cards: nextCards };
        });
    }, []);

    const syncReplayState = useCallback((source: SoloGameState) => {
        setGameState((prev) => {
            if (!prev) return prev;
            const nextCards = prev.cards.map((t) => {
                const s = source.cards.find((c) => c.id === t.id);
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
                };
            });
            return {
                ...prev,
                score: source.score,
                moves: source.moves ?? 0,
                status: source.status,
                ...(source.zones?.length ? { zones: source.zones } : {}),
                cards: nextCards,
            };
        });
    }, []);

    const pushScoreFloat = useCallback((delta: number, anchorZoneId?: string) => {
        if (!Number.isFinite(delta) || delta === 0) return;
        if (delta > 0) AudioBus.emit("game.solitaire.score_delta");
        const id = ++scoreFloatIdRef.current;
        setScoreFloats((list) => [...list.slice(-6), { id, delta, anchorZoneId }]);
        window.setTimeout(() => {
            setScoreFloats((list) => list.filter((f) => f.id !== id));
        }, 1100);
    }, []);

    const syncReplayScore = useCallback(
        (source: SoloGameState, opts?: { anchorZoneId?: string }) => {
            setGameState((prev) => {
                if (!prev) return prev;
                if (
                    prev.score === source.score &&
                    (prev.moves ?? 0) === (source.moves ?? 0) &&
                    prev.status === source.status
                ) {
                    return prev;
                }
                if (
                    typeof source.score === "number" &&
                    typeof prev.score === "number" &&
                    source.score !== prev.score
                ) {
                    const delta = source.score - prev.score;
                    const zoneId = opts?.anchorZoneId;
                    queueMicrotask(() => pushScoreFloat(delta, zoneId));
                }
                return {
                    ...prev,
                    score: source.score,
                    moves: source.moves ?? 0,
                    status: source.status,
                };
            });
        },
        [pushScoreFloat]
    );

    useEffect(() => {
        if (!replaySeedId || gameId) return;
        setGameState(createRolloutReplayState(replaySeedId));
        setDealEvent(null);
        setInteractionPhase(GameInteractionPhase.idle);
        onGameLoadComplete?.();
    }, [replaySeedId, gameId, onGameLoadComplete]);

    useEffect(() => {
        if (replaySeedId && !gameId) return;
        setGameState(null);
        setDealEvent(null);
        setOpeningDealActive(false);
        openingDealStartedRef.current = false;
        setInteractionPhase(GameInteractionPhase.idle);
        void loadGame();
    }, [loadGame, replaySeedId, gameId]);

    /** 发牌/走子动画异常未回调时，避免长期锁在 animating（表现为「有遮罩、不能操作」） */
    useEffect(() => {
        if (interactionPhase !== GameInteractionPhase.animating) return;
        // Opening deal has its own wait timeout; the 4s watchdog was killing it before start.
        if (dealEventRef.current || openingDealActive) return;
        const id = window.setTimeout(() => {
            // 清盘 / 胜利动画可能超过 4s；此时强行 idle 会让滞后 React model 把牌刷回 tableau
            if (autoCompleteLayoutGate.blocked) return;
            if (
                document.querySelector(
                    ".solo-player-container[data-solo-victory='1'], .solo-board-surface[data-solo-victory='1']"
                )
            ) {
                return;
            }
            if (dealEventRef.current || timelinesRef.current.dealOpening) return;
            console.warn('[SoloGameProvider] interaction animating watchdog -> idle');
            setInteractionPhase(GameInteractionPhase.idle);
        }, 4_000);
        return () => window.clearTimeout(id);
    }, [interactionPhase, openingDealActive]);

    /**
     * Play short opening deal once cards + board are mounted.
     * Poll via rAF (board dim via ref) so ResizeObserver measure churn cannot cancel the wait.
     */
    useLayoutEffect(() => {
        if (!dealEvent || !gameState) return;
        if (openingDealStartedRef.current) return;

        let cancelled = false;
        let raf = 0;
        const startedAt = performance.now();
        const patches = dealEvent.cards;

        const tryStart = () => {
            if (cancelled || openingDealStartedRef.current) return;
            const dim = boardDimensionRef.current;
            // `ele` starts undefined — must use != null (!== null wrongly treats undefined as ready).
            const ready =
                !!dim &&
                gameState.cards.length > 0 &&
                gameState.cards.every((card) => card.ele != null && card.ele.isConnected);
            if (!ready) {
                if (performance.now() - startedAt > 8_000) {
                    console.warn('[SoloGameProvider] opening deal wait timed out');
                    finishOpeningDeal();
                    return;
                }
                raf = window.requestAnimationFrame(tryStart);
                return;
            }

            openingDealStartedRef.current = true;
            setOpeningDealActive(true);
            setInteractionPhase(GameInteractionPhase.animating);

            const st = Number(gameState.status);
            let animState = gameState;
            if (st === SoloGameStatus.OPEN) {
                animState = applyDealPatchesToGame(gameState, patches);
                setGameState(animState);
            }

            AudioBus.emit("game.solitaire.deal.opening");
            dealEffect({
                effectType: "opening",
                timelines: timelinesRef.current,
                data: {
                    cards: patches,
                    gameState: animState,
                    boardDimensionRef,
                    boardDimension: dim,
                },
                onComplete: () => {
                    if (Number(animState.status) === SoloGameStatus.OPEN) {
                        setGameState((prev) =>
                            prev ? applyDealPatchesToGame(prev, patches) : prev
                        );
                    }
                    finishOpeningDeal();
                },
            });
        };

        raf = window.requestAnimationFrame(tryStart);
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(raf);
        };
    }, [dealEvent, gameState, finishOpeningDeal]);

    // const isPlaying = useCallback((card: SoloCard) => {
    //     return Object.values(timelinesRef.current).some(tl => tl.timeline.isActive() && tl.cards.some(c => c.id === card.id));
    // }, []);
    const value: ISoloGameContext = {
        gameState,
        boardDimension,
        boardDimensionRef,
        config,
        ruleManager,
        interactionPhase,
        setInteractionPhase,
        updateBoardDimension,
        loadGame,
        reloadCasualRun,
        skipOpeningDeal,
        openingDealActive,
        saveUpdate,
        syncReplayState,
        syncReplayScore,
        pushScoreFloat,
        scoreFloats,
        replayMode,
        casualTournamentId,
        targetScore,
        onGameSubmit,
        onTriathlonNextGame,
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
