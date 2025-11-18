/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { useConvex } from 'convex/react';
import gsap from 'gsap';
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../../../convex/solitaireArena/convex/_generated/api';
import { dealEffect } from '../animation/effects/dealEffect';
import {
    ActionStatus,
    Card,
    DEFAULT_GAME_CONFIG,
    GameReport,
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
    gameReport: GameReport | null;
    boardDimension: SoloBoardDimension | null;
    boardDimensionRef: RefObject<SoloBoardDimension | null>;
    config: SoloGameConfig;
    ruleManager: SolitaireRule | null;
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
    onGameOver: () => void;
    submitScore: (score: number) => void;
    isPlaying: (card: SoloCard) => boolean;
}

const SoloGameContext = createContext<ISoloGameContext>({
    gameReport: null,
    timelines: {},
    gameState: null,
    boardDimension: null,
    boardDimensionRef: { current: null },
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    updateBoardDimension: () => { },
    submitScore: () => { },
    onGameOver: () => { },
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
    onGameSubmit?: () => void;
}

export const SoloGameProvider: React.FC<SoloGameProviderProps> = ({ children, gameId, config: customConfig, onGameLoadComplete, onGameSubmit }) => {
    const [gameState, setGameState] = useState<SoloGameState | null>(null);
    const [gameReport, setGameReport] = useState<GameReport | null>(null);
    const [dealEvent, setDealEvent] = useState<{ cards: Card[], name: string } | null>(null);
    const [boardDimension, setBoardDimension] = useState<SoloBoardDimension | null>(null);
    const boardDimensionRef = useRef<SoloBoardDimension | null>(null);
    const timelinesRef = useRef<{ [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }>({});
    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
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



    const onGameOver = useCallback(async () => {
        if (gameState?.reportElement && convex) {
            gsap.to(gameState.reportElement, {
                opacity: 1,
                visibility: 'visible',
                duration: 1,
                ease: 'power2.inOut'
            });
            const res = await convex.query(api.service.gameManager.findReport, { gameId: gameState.gameId });
            if (res.ok) {
                setGameReport(res.data as GameReport);
            }
        }
    }, [gameState, convex]);
    const submitScore = useCallback(async (score: number) => {
        if (!gameState) return;
        if (gameState.reportElement) {
            gsap.to(gameState.reportElement, {
                onComplete: () => {
                    onGameSubmit?.();
                },
                opacity: 0,
                visibility: 'hidden',
                duration: 1,
                ease: 'power2.inOut'
            });
        }
        convex.action(api.proxy.controller.submitScore, { gameId: gameState.gameId, score }).then((res) => {
            if (res.ok) {
                console.log("score submitted", res);
            }
        });
    }, [gameState, convex])
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
    }, [convex, gameId]);
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
        gameReport,
        gameState,
        boardDimension,
        boardDimensionRef,
        config,
        ruleManager,
        updateBoardDimension,
        submitScore,
        onGameOver,
        isPlaying
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
