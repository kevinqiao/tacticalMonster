/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { useConvex } from 'convex/react';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
    gameState: SoloGameState | null;
    boardDimension: SoloBoardDimension | null;
    config: SoloGameConfig;
    ruleManager: SolitaireRule | null;
    updateBoardDimension: (dimension: SoloBoardDimension) => void;
    loadGame: (game: SoloGameState) => void;
    submitScore: (score: number) => void;
}

const SoloGameContext = createContext<ISoloGameContext>({

    gameState: null,
    boardDimension: null,
    config: DEFAULT_GAME_CONFIG,
    ruleManager: null,
    updateBoardDimension: () => { },
    loadGame: () => { },
    submitScore: () => { }
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
        setBoardDimension(dimension);
    }, []);

    const loadGame = useCallback((game: SoloGameState) => {
        // setGameState({ ...game, actionStatus: ActionStatus.ACTING });
        // updateUserData({ game: { name: 'solitaire', gameId: game.gameId } });
        // onGameLoadComplete?.();
    }, []);
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
                console.log("loadGame res", res);
                // loadGame(res.game);
                const game = { ...res.game, actionStatus: ActionStatus.ACTING };
                const event = res.events?.find((event: any) => event.name === "deal");
                console.log("event", event);
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

        if (dealEvent && gameState && boardDimension) {
            const ready = gameState?.cards.every(card => card.ele !== null) || false;
            if (ready) {
                dealEffect({
                    effectType: 'fan',
                    data: { cards: dealEvent.cards, gameState, boardDimension },
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
                        gameState.status = SoloGameStatus.DEALED;

                    }
                });
            }
        }
    }, [dealEvent, gameState, boardDimension]);


    const value: ISoloGameContext = {
        gameState,
        boardDimension,
        config,
        ruleManager,
        updateBoardDimension,
        loadGame,
        submitScore
    };

    return (
        <SoloGameContext.Provider value={value}>
            {children}
        </SoloGameContext.Provider>
    );
};

export default SoloGameProvider;
