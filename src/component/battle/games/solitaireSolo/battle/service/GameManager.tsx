/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { useConvex } from 'convex/react';
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../../../../convex/solitaireArena/convex/_generated/api';
import { dealEffect } from '../animation/effects/dealEffect';
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
    // timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } };
    gameState: SoloGameState | null;
    boardDimension: SoloBoardDimension | null;
    boardDimensionRef: RefObject<SoloBoardDimension | null>;
    config: SoloGameConfig;
    ruleManager: SolitaireRule | null;
    interactionPhase: GameInteractionPhase;
    setInteractionPhase: (phase: GameInteractionPhase) => void;
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
    loadGame: () => void;
    // onGameOver: () => void;
    // submitScore: (score: number) => void;
    // isPlaying: (card: SoloCard) => boolean;
}

const SoloGameContext = createContext<ISoloGameContext>({
    // timelines: {},
    gameState: null,
    boardDimension: null,
    boardDimensionRef: { current: null },
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    interactionPhase: GameInteractionPhase.idle,
    setInteractionPhase: () => { },
    updateBoardDimension: () => { },
    loadGame: () => { },
    // submitScore: () => { },
    // onGameOver: () => { },
    // isPlaying: () => false

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
    config?: Partial<SoloGameConfig>;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

export const SoloGameProvider: React.FC<SoloGameProviderProps> = ({ children, gameId, config: customConfig, onGameLoadComplete, onGameSubmit }) => {
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
        if (res.ok) {
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
            console.log("game loaded", game);
            setGameState(game);
        }
    }, [convex, gameId]);
    useEffect(() => {
        loadGame();
    }, [loadGame]);
    useEffect(() => {

        if (dealEvent && gameState?.status === SoloGameStatus.OPEN && boardDimension) {

            const ready = gameState?.cards.every(card => card.ele !== null) || false;
            if (ready) {
                gameState.status = SoloGameStatus.DEALED
                dealEffect({
                    effectType: 'fan',
                    data: { cards: dealEvent.cards, gameState, boardDimensionRef },
                    onComplete: () => {
                        dealEvent.cards.forEach((r: SoloCard) => {
                            const card = gameState.cards.find((c: SoloCard) => c.id === r.id);
                            if (card) {
                                card.isRevealed = r.isRevealed;
                                card.zone = r.zone;
                                card.zoneId = r.zoneId;
                                card.zoneIndex = r.zoneIndex;
                            }
                        });
                        setInteractionPhase(GameInteractionPhase.idle);
                    }
                });
            }
        }
    }, [dealEvent, gameState, boardDimension]);

    // const isPlaying = useCallback((card: SoloCard) => {
    //     return Object.values(timelinesRef.current).some(tl => tl.timeline.isActive() && tl.cards.some(c => c.id === card.id));
    // }, []);
    const value: ISoloGameContext = {
        // timelines: timelinesRef.current,
        gameState,
        boardDimension,
        boardDimensionRef,
        config,
        ruleManager,
        interactionPhase,
        setInteractionPhase,
        updateBoardDimension,
        loadGame,
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
