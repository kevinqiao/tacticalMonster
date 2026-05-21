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
    SoloGameStatus
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
    const loadGame = useCallback(async () => {
        if (!gameId) return;
        const res = await convex.action(api.proxy.controller.loadGame, { gameId });
        if (!res.ok) {
            console.error('[SoloGameProvider] loadGame failed', (res as { error?: string }).error, res);
            return;
        }
        const raw = res.game as SoloGameState & { actionStatus?: string };
        const { actionStatus: _drop, ...rest } = raw;
        const game = rest as SoloGameState;
        const event = res.events?.find((e: { name?: string }) => e.name === "deal");
        // 仅当局仍为 OPEN 时才跑发牌动画；库中已是 DEALED 时若仍带 deal 事件，不应锁在 animating（否则 getActModes 永远为空）
        if (event) {
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
        if (event) {
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
    useEffect(() => {
        if (!dealEvent || gameState?.status !== SoloGameStatus.OPEN || !boardDimension) return;

        const ready = gameState.cards.every((card) => card.ele !== null) || false;
        if (!ready) return;

        setGameState((prev) => {
            if (!prev || prev.status !== SoloGameStatus.OPEN) return prev;
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
        setDealEvent(null);
        /** 必须回到 idle：`SoloDnDCard` 在 animating 时默认不跑 `initCard`（避免走子动画期间被旧 state 抢写 GSAP），idle 后才把牌摆到棋盘。 */
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
