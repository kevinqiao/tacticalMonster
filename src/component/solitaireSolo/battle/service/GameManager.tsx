/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { useConvex } from 'convex/react';
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUserManager } from 'service/UserManager';
import { api } from '../../../../convex/solitaireArena/convex/_generated/api';
import { dealEffect } from '../animation/effects/dealEffect';
import {
    ActionStatus,
    Card,
    DEFAULT_GAME_CONFIG,
    SolitaireRule,
    SoloBoardDimension,
    SoloCard,
    SoloGameConfig,
    SoloGameState,
    SoloGameStatus
} from '../types/SoloTypes';
import SoloRuleManager from './SoloRuleManager';

interface ISoloGameContext {
    timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } };
    gameState: SoloGameState | null;
    boardDimension: SoloBoardDimension | null;
    boardDimensionRef: RefObject<SoloBoardDimension | null>;
    config: SoloGameConfig;
    ruleManager: SolitaireRule | null;
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
    submitScore: (score: number) => void;
    isPlaying: (card: SoloCard) => boolean;
}

const SoloGameContext = createContext<ISoloGameContext>({
    timelines: {},
    gameState: null,
    boardDimension: null,
    boardDimensionRef: { current: null },
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    updateBoardDimension: () => { },
    submitScore: () => { },
    isPlaying: () => false

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
}

export const SoloGameProvider: React.FC<SoloGameProviderProps> = ({ children, gameId, config: customConfig, onGameLoadComplete }) => {
    const [gameState, setGameState] = useState<SoloGameState | null>(null);
    const [dealEvent, setDealEvent] = useState<{ cards: Card[], name: string } | null>(null);
    const [boardDimension, setBoardDimension] = useState<SoloBoardDimension | null>(null);
    const boardDimensionRef = useRef<SoloBoardDimension | null>(null);
    const timelinesRef = useRef<{ [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }>({});
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    const { updateUserData } = useUserManager();
    const convex = useConvex();
    // const fetchGame = useAction(api.proxy.controller.loadGame);
    const ruleManager = useMemo(() => {
        if (!gameState) return null;
        return new SoloRuleManager(gameState)
    }, [gameState])


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



    const submitScore = useCallback(async (score: number) => {
        if (gameId && convex) {
            convex.action(api.proxy.controller.submitScore, { gameId, score }).then((res) => {
                if (res.ok) {
                    console.log("score", score);
                }
            });
        }
    }, [gameId, convex]);
    useEffect(() => {

        const load = async () => {
            if (!gameId) return;
            const res = await convex.action(api.proxy.controller.loadGame, { gameId });
            if (res.ok) {
                // loadGame(res.game);
                const game = { ...res.game, actionStatus: ActionStatus.ACTING };
                const event = res.events?.find((event: any) => event.name === "deal");
                // console.log("event", event);
                if (event)
                    setDealEvent(event);
                else {
                    game.actionStatus = ActionStatus.IDLE;
                }
                setGameState(game);
                onGameLoadComplete?.();
            }
        }
        if (gameId && convex) {
            load();
        }
    }, [gameId, convex]);
    useEffect(() => {

        if (dealEvent && gameState?.status === SoloGameStatus.OPEN && boardDimension) {

            const ready = gameState?.cards.every(card => card.ele !== null) || false;
            if (ready) {
                gameState.status = SoloGameStatus.DEALED
                dealEffect({
                    timelines: timelinesRef.current,
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
                            // console.log('update card', card);
                        });

                        gameState.actionStatus = ActionStatus.IDLE;

                    }
                });
            }
        }
    }, [dealEvent, gameState, boardDimension]);

    const isPlaying = useCallback((card: SoloCard) => {
        return Object.values(timelinesRef.current).some(tl => tl.timeline.isActive() && tl.cards.some(c => c.id === card.id));
    }, []);
    const value: ISoloGameContext = {
        timelines: timelinesRef.current,
        gameState,
        boardDimension,
        boardDimensionRef,
        config,
        ruleManager,
        updateBoardDimension,
        submitScore,
        isPlaying
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
