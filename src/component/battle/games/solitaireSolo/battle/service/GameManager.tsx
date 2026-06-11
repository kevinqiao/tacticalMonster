/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { useConvex } from 'convex/react';
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
    isSolitairePlayableStatus,
} from '../types/SoloTypes';
import SoloRuleManager from './SoloRuleManager';

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
    casualTournamentId?: string;
    onGameSubmit?: () => void;
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
    casualTournamentId: undefined,
    onGameSubmit: undefined,
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
    casualTournamentId?: string;
    config?: Partial<SoloGameConfig>;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

export const SoloGameProvider: React.FC<SoloGameProviderProps> = ({
    children,
    gameId,
    casualTournamentId,
    config: customConfig,
    onGameLoadComplete,
    onGameSubmit,
}) => {
    const [gameState, setGameState] = useState<SoloGameState | null>(null);
    const [dealEvent, setDealEvent] = useState<{ cards: Card[], name: string } | null>(null);
    const [boardDimension, setBoardDimension] = useState<SoloBoardDimension | null>(null);
    const [interactionPhase, setInteractionPhase] = useState<GameInteractionPhase>(GameInteractionPhase.idle);
    const boardDimensionRef = useRef<SoloBoardDimension | null>(null);
    const timelinesRef = useRef<{ [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }>({});
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const convex = useConvex();

    const ruleManager = useMemo(() => {
        if (!gameState) return null;
        return new SoloRuleManager(gameState, interactionPhase);
    }, [gameState, interactionPhase]);


    // 更新棋盘尺寸
    const updateBoardDimension = useCallback((dimension: SoloBoardDimension) => {
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
            return await convex.action(api.proxy.controller.loadGame, { gameId });
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
        const game = rest as SoloGameState;
        const event = res.events?.find((e: { name?: string }) => e.name === "deal");
        const st = Number(game.status);
        const skipDealAnim =
            isSolitairePlayableStatus(st) ||
            st === SoloGameStatus.COMPLETED ||
            st === SoloGameStatus.CANCELLED;
        // 仅 OPEN 局播发牌动画；已 DEALED/PLAYING 时忽略 deal 事件，避免长期 animating + 牌面 opacity 0
        if (event && !skipDealAnim) {
            setDealEvent(event);
            setInteractionPhase(GameInteractionPhase.animating);
        } else {
            setDealEvent(null);
            setInteractionPhase(GameInteractionPhase.idle);
        }
        onGameLoadComplete?.();
        setGameState(game);
    }, [convex, gameId, onGameLoadComplete]);

    const reloadCasualRun = useCallback(async (): Promise<boolean> => {
        if (!gameId || !gameId.startsWith("game_")) return false;
        const res = await convex.action(api.proxy.controller.loadGame, {
            gameId,
            resetCasualRun: true,
        });
        if (!res.ok) {
            console.error("[SoloGameProvider] reloadCasualRun failed", (res as { error?: string }).error);
            return false;
        }
        const raw = res.game as SoloGameState & { actionStatus?: string };
        const { actionStatus: _drop, ...rest } = raw;
        const game = rest as SoloGameState;
        const event = res.events?.find((e: { name?: string }) => e.name === "deal");
        const st = Number(game.status);
        const skipDealAnim =
            isSolitairePlayableStatus(st) ||
            st === SoloGameStatus.COMPLETED ||
            st === SoloGameStatus.CANCELLED;
        if (event && !skipDealAnim) {
            setDealEvent(event);
            setInteractionPhase(GameInteractionPhase.animating);
        } else {
            setDealEvent(null);
            setInteractionPhase(GameInteractionPhase.idle);
        }
        setGameState(game);
        return true;
    }, [convex, gameId]);

    useEffect(() => {
        loadGame();
    }, [loadGame]);

    /** 发牌/走子动画异常未回调时，避免长期锁在 animating（表现为「有遮罩、不能操作」） */
    useEffect(() => {
        if (interactionPhase !== GameInteractionPhase.animating) return;
        const id = window.setTimeout(() => {
            console.warn('[SoloGameProvider] interaction animating watchdog -> idle');
            setDealEvent(null);
            setInteractionPhase(GameInteractionPhase.idle);
        }, 4_000);
        return () => window.clearTimeout(id);
    }, [interactionPhase]);

    useEffect(() => {
        if (!dealEvent || !boardDimension || !gameState) return;

        const ready = gameState.cards.every((card) => card.ele !== null) || false;
        if (!ready) return;

        const st = Number(gameState.status);
        if (st === SoloGameStatus.OPEN) {
            setGameState((prev) => {
                if (!prev || Number(prev.status) !== SoloGameStatus.OPEN) return prev;
                const byId = new Map(dealEvent.cards.map((r: Card) => [r.id, r]));
                const cards = prev.cards.map((c: SoloCard) => {
                    const r = byId.get(c.id);
                    if (!r) return c;
                    return {
                        ...c,
                        isRevealed: r.isRevealed,
                        zone: r.zone,
                        zoneId: r.zoneId,
                        zoneIndex: r.zoneIndex,
                    };
                });
                return { ...prev, status: SoloGameStatus.DEALED, cards };
            });
        }
        setDealEvent(null);
        setInteractionPhase(GameInteractionPhase.idle);
    }, [dealEvent, gameState, boardDimension]);

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
        casualTournamentId,
        onGameSubmit,
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
