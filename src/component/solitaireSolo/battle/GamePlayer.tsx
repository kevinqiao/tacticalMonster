/**
 * 单人纸牌游戏主界面组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { SoloDnDCard } from '..';
import { ThreeJsBounceLayer } from './animation/ThreeJsBounceLayer';
import { useEventManager } from './service/EventProvider';
import { useSoloGameManager } from './service/GameManager';
import useActHandler from './service/handler/useActHandler';
import { SoloGameEngine } from './service/SoloGameEngine';
import './style.css';
import { victoryDeck } from './testData/victoryDeck';
import { ActionStatus, CARD_SUITS, SoloBoardDimension, SoloCard, SoloGameState, SUIT_ICONS } from './types/SoloTypes';
import { createZones } from './Utils';

interface SoloPlayerProps {
    onGameStart?: () => void;
}

const SoloPlayer: React.FC<SoloPlayerProps> = ({
    onGameStart,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        ruleManager,
        gameState,
        boardDimension,
        updateBoardDimension,
        loadGame
    } = useSoloGameManager();
    const { cards } = gameState || {};

    const { recycle, deal, checkGameOver } = useActHandler();
    const { addEvent } = useEventManager();
    // 响应式断点
    const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');


    // 统一的卡牌样式函数
    const getUnifiedCardStyle = useCallback((additionalStyle: React.CSSProperties = {}): React.CSSProperties => {
        if (!boardDimension) return additionalStyle;
        return {
            // 统一尺寸设置
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            minHeight: boardDimension.cardHeight, // 使用动态最小高度
            maxHeight: boardDimension.cardHeight, // 强制最大高度
            boxSizing: 'border-box',
            flexShrink: 0,
            // 附加样式
            ...additionalStyle
        };
    }, [boardDimension]);

    // 计算棋盘尺寸 - 优化自适应逻辑
    const calculateBoardDimension = useCallback((): SoloBoardDimension => {
        if (!containerRef.current) {
            return {
                left: 0,
                top: 0,
                width: 800,
                height: 600,
                cardWidth: 60,
                cardHeight: 84,
                spacing: 10,
                zones: {
                    foundations: { x: 50, y: 50, width: 240, height: 84 },
                    talon: { x: 50, y: 150, width: 60, height: 84 },
                    waste: { x: 120, y: 150, width: 60, height: 84 },
                    tableau: { x: 50, y: 250, width: 700, height: 300 }
                }
            };
        }

        const rect = containerRef.current.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        // 根据屏幕尺寸确定断点
        let currentScreenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop';
        if (containerWidth < 768) {
            currentScreenSize = 'mobile';
        } else if (containerWidth < 1024) {
            currentScreenSize = 'tablet';
        }
        console.log('currentScreenSize', currentScreenSize);
        // 更新屏幕尺寸状态
        setScreenSize((prev) => prev !== currentScreenSize ? currentScreenSize : prev);
        // 根据屏幕尺寸调整参数
        const isMobile = currentScreenSize === 'mobile';
        const isTablet = currentScreenSize === 'tablet';
        const minWidth = isMobile ? 320 : isTablet ? 500 : 600;
        const minHeight = isMobile ? 300 : isTablet ? 350 : 400;
        const maxCardWidth = isMobile ? 50 : isTablet ? 65 : 80;
        const minCardWidth = isMobile ? 30 : isTablet ? 35 : 40;

        // 根据容器尺寸计算卡牌大小
        const availableWidth = Math.max(containerWidth, minWidth);
        const availableHeight = Math.max(containerHeight, minHeight);

        // 根据屏幕尺寸调整布局比例
        const foundationsRatio = isMobile ? 0.8 : isTablet ? 0.7 : 0.6;
        const tableauRatio = isMobile ? 0.95 : isTablet ? 0.92 : 0.9;

        // 基础堆需要4张卡牌 + 3个间距
        const foundationsAreaWidth = availableWidth * foundationsRatio;
        const cardWidth = Math.max(
            minCardWidth,
            Math.min(maxCardWidth, (foundationsAreaWidth - 3 * 10) / 4)
        );

        // 牌桌需要7张卡牌 + 6个间距
        const tableauAreaWidth = availableWidth * tableauRatio;
        const tableauCardWidth = Math.max(
            minCardWidth,
            Math.min(maxCardWidth, (tableauAreaWidth - 6 * 10) / 7)
        );

        // 使用较小的卡牌宽度确保所有区域都能适应
        const finalCardWidth = Math.min(cardWidth, tableauCardWidth);
        const cardHeight = finalCardWidth * 1.5;
        const spacing = Math.max(8, finalCardWidth * 0.15);

        // 计算各区域位置
        const foundationsWidth = finalCardWidth * 4 + spacing * 3;
        const foundationsX = (availableWidth - foundationsWidth) / 2;

        // 移动端时调整牌堆和废牌堆的布局
        let talonX, wasteX, wasteWidth;
        // if (isMobile) {
        //     // 移动端：牌堆和废牌堆垂直排列
        //     talonX = (availableWidth - finalCardWidth) / 2;
        //     wasteX = talonX;
        //     wasteWidth = finalCardWidth;
        // } else {
        // 桌面端：牌堆和废牌堆水平排列
        talonX = spacing;
        wasteX = talonX + finalCardWidth + spacing;
        // wasteWidth = isMobile ? finalCardWidth : finalCardWidth * 3 + spacing * 2;
        wasteWidth = finalCardWidth * 3 + spacing * 2;
        // }

        const finalTableauWidth = finalCardWidth * 7 + spacing * 6;
        const tableauX = (availableWidth - finalTableauWidth) / 2;

        return {
            left: rect.left,
            top: rect.top,
            width: availableWidth,
            height: availableHeight,
            cardWidth: finalCardWidth,
            cardHeight,
            spacing,
            zones: {
                foundations: {
                    x: foundationsX,
                    y: spacing,
                    width: foundationsWidth,
                    height: cardHeight
                },
                talon: {
                    x: talonX,
                    y: spacing * 2 + cardHeight,
                    width: finalCardWidth,
                    height: cardHeight
                },
                waste: {
                    x: wasteX,
                    // y: isMobile ? spacing * 3 + cardHeight * 2 : spacing * 2 + cardHeight,
                    y: spacing * 2 + cardHeight,
                    width: wasteWidth,
                    height: cardHeight
                },
                tableau: {
                    x: tableauX,
                    y: isMobile ? spacing * 4 + cardHeight * 3 : spacing * 3 + cardHeight * 2,
                    width: finalTableauWidth,
                    height: Math.min(
                        cardHeight * (isMobile ? 4 : 6),
                        availableHeight - (isMobile ? spacing * 4 + cardHeight * 3 : spacing * 3 + cardHeight * 2) - spacing
                    )
                }
            }
        };
    }, [screenSize]); // 添加 screenSize 依赖

    // 更新棋盘尺寸
    useEffect(() => {
        const updateDimension = () => {
            const dimension = calculateBoardDimension();
            updateBoardDimension(dimension);
        };

        updateDimension();

        // 添加防抖处理，避免频繁更新
        let timeoutId: NodeJS.Timeout;
        const debouncedUpdate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateDimension, 100);
        };

        window.addEventListener('resize', debouncedUpdate);
        return () => {
            window.removeEventListener('resize', debouncedUpdate);
            clearTimeout(timeoutId);
        };
    }, [calculateBoardDimension, updateBoardDimension]);

    // 调试信息 - 确保尺寸一致性
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && boardDimension) {
            console.log('SoloPlayer Debug - Card Dimensions:', {
                cardWidth: boardDimension.cardWidth,
                cardHeight: boardDimension.cardHeight,
                spacing: boardDimension.spacing,
                screenSize: screenSize
            });
        }
    }, [boardDimension, screenSize]);
    const loadZone = useCallback((zoneId: string, ele: HTMLDivElement | null) => {
        if (!gameState || !boardDimension) return;
        const zone = gameState.zones.find(z => z.id === zoneId);
        if (zone) {
            zone.ele = ele;
        }
    }, [gameState, boardDimension]);


    const handleDeal = useCallback(() => {
        if (!gameState) return;
        const dealedCards = SoloGameEngine.deal(gameState.cards);
        addEvent({
            id: Date.now().toString(),
            name: "deal",
            data: { cards: dealedCards }
        });

    }, [addEvent, gameState]);
    const createGameOverEvent = useCallback(() => {
        if (!gameState) return;
        addEvent({
            id: Date.now().toString(),
            name: "gameOver",
            data: { cards: gameState.cards }
        });
    }, [gameState]);
    const handleGameOver = useCallback(() => {
        const game = SoloGameEngine.createGame();
        const cards: SoloCard[] = victoryDeck
        const zones = createZones();
        const modelGameState: SoloGameState = { ...game, cards, zones, actionStatus: ActionStatus.IDLE };
        loadGame(modelGameState);
        // setTimeout(() => {
        //     console.log("checkGameOver");
        //     checkGameOver('fountain');
        // }, 2000);
    }, [loadGame, gameState, ruleManager]);
    const handleGameOpen = useCallback(() => {
        console.log("handleGameOpen");
        const game = SoloGameEngine.createGame();
        SoloGameEngine.shuffleDeck(game.cards);
        const zones = createZones();
        const gameState: SoloGameState = { ...game, zones, actionStatus: ActionStatus.IDLE };
        loadGame(gameState);
    }, [loadGame]);
    const handleGameInit = useCallback(() => {
        console.log("handleGameInit");
        const game = SoloGameEngine.createGame();
        SoloGameEngine.shuffleDeck(game.cards);
        const dealedCards = SoloGameEngine.deal(game.cards);
        dealedCards.forEach((r: SoloCard) => {
            const card = game.cards.find((c: SoloCard) => c.id === r.id);
            if (card) {
                card.isRevealed = r.isRevealed;
                card.zone = r.zone;
                card.zoneId = r.zoneId;
                card.zoneIndex = r.zoneIndex;
            }
            // console.log('update card', card);
        });
        const zones = createZones();
        const gameState: SoloGameState = { ...game, zones, actionStatus: ActionStatus.IDLE };
        loadGame(gameState);
    }, [loadGame]);




    // 渲染基础堆
    const renderFoundations = useCallback(() => {
        if (!gameState || !boardDimension) return null;

        // const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        return CARD_SUITS.map((suit, index) => {

            return (
                <div
                    key={`foundation-${suit}`}
                    ref={(ele) => loadZone(`foundation-${suit}`, ele)}
                    className="foundation-zone"
                    data-zone-id={`foundation-${suit}`}
                    data-drop-zone="true"
                    style={{
                        position: 'absolute',
                        left: boardDimension.zones.foundations.x + index * (boardDimension.cardWidth + boardDimension.spacing),
                        top: boardDimension.zones.foundations.y,
                        width: boardDimension.cardWidth,
                        height: boardDimension.cardHeight,
                        border: '2px dashed #ccc',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.1)'
                    }}
                >
                    {SUIT_ICONS[suit]}
                </div>
            );
        });
    }, [gameState, boardDimension, getUnifiedCardStyle]);

    // 渲染牌堆
    const renderTalon = useCallback(() => {
        if (!gameState || !boardDimension) return null;

        return (
            <div
                className="talon-zone"
                ref={(ele) => loadZone('talon', ele)}
                style={{
                    position: 'absolute',
                    left: boardDimension.zones.talon.x,
                    top: boardDimension.zones.talon.y,
                    width: boardDimension.cardWidth,
                    height: boardDimension.cardHeight,
                    border: '2px dashed #ccc',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    cursor: 'pointer'
                }}
            >

            </div>
        );
    }, [gameState, boardDimension]);

    // 渲染废牌堆
    const renderWaste = useCallback(() => {
        if (!gameState || !boardDimension) return null;

        return (
            <div
                ref={(ele) => loadZone('waste', ele)}
                className="waste-zone"
                style={{
                    position: 'absolute',
                    left: boardDimension.zones.waste.x,
                    top: boardDimension.zones.waste.y,
                    width: boardDimension.zones.waste.width,
                    height: boardDimension.cardHeight
                }}
            >

            </div>
        );
    }, [gameState, boardDimension, getUnifiedCardStyle]);

    // 渲染牌桌
    const renderTableau = useCallback(() => {
        if (!boardDimension) return null;
        // console.log('boardDimension', boardDimension);
        return Array.from({ length: 7 }, (_, colIndex) => {
            return (
                <div
                    key={`tableau-col-${colIndex}`}
                    ref={(ele) => loadZone(`tableau-${colIndex}`, ele)}
                    className="tableau-column"
                    data-zone-id={`tableau-${colIndex}`}
                    data-drop-zone="true"
                    style={{
                        position: 'absolute',
                        left: boardDimension.zones.tableau.x + colIndex * (boardDimension.cardWidth + boardDimension.spacing),
                        top: boardDimension.zones.tableau.y,
                        width: boardDimension.cardWidth,
                        height: boardDimension.zones.tableau.height,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: boardDimension.spacing * 0.3
                    }}
                >

                </div>
            );
        });
    }, [gameState, boardDimension, getUnifiedCardStyle]);
    const renderCards = useMemo(() => {
        if (!cards || !boardDimension) return null;
        return cards.sort((a, b) => (a.zoneIndex || 0) - (b.zoneIndex || 0)).map((card, cardIndex) => (
            <SoloDnDCard
                key={card.id}
                card={card}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: 0,
                    width: boardDimension.cardWidth,
                    height: boardDimension.cardHeight,
                    zIndex: card.zoneIndex + 100
                }}
            />
        ))

    }, [cards, boardDimension]);

    // 渲染控制面板
    const renderControlPanel = useCallback(() => {

        const isMobile = screenSize === 'mobile';
        const isTablet = screenSize === 'tablet';

        return (
            <div
                className={isMobile || isTablet ? "control-panel-mobile" : "control-panel"}
                style={{
                    display: 'flex',
                    flexDirection: isMobile || isTablet ? 'row' : 'column',
                    gap: isMobile || isTablet ? '5px' : '10px',
                    zIndex: 1000
                }}
            >
                <button
                    onClick={handleGameOpen}
                    style={{
                        fontSize: isMobile ? '12px' : '14px',
                        padding: isMobile ? '6px 8px' : '8px 12px',
                        height: isMobile ? '32px' : '36px', // 固定高度
                        minHeight: isMobile ? '32px' : '36px',
                    }}
                >
                    Open Game
                </button>
                <button
                    onClick={handleGameInit}
                    style={{
                        fontSize: isMobile ? '12px' : '14px',
                        padding: isMobile ? '6px 8px' : '8px 12px',
                        height: isMobile ? '32px' : '36px', // 固定高度
                        minHeight: isMobile ? '32px' : '36px',
                    }}
                >
                    Init Game
                </button>
                <button
                    onClick={recycle}
                    style={{
                        fontSize: isMobile ? '12px' : '14px',
                        padding: isMobile ? '6px 8px' : '8px 12px',
                        height: isMobile ? '32px' : '36px', // 固定高度
                        minHeight: isMobile ? '32px' : '36px',
                    }}
                >
                    Recycle
                </button>


                <button
                    onClick={() => deal('fan')}
                    style={{
                        fontSize: isTablet ? '12px' : '14px',
                        padding: isTablet ? '6px 8px' : '8px 12px',
                        height: isTablet ? '32px' : '36px',
                        minHeight: isTablet ? '32px' : '36px',
                        flex: 'none'
                    }}
                >
                    Deal
                </button>
                <button
                    onClick={() => deal('spiral')}
                    style={{
                        fontSize: isTablet ? '12px' : '14px',
                        padding: isTablet ? '6px 8px' : '8px 12px',
                        height: isTablet ? '32px' : '36px',
                        minHeight: isTablet ? '32px' : '36px',
                        flex: 'none'
                    }}
                >
                    Deal(spiral)
                </button>
                <button
                    onClick={() => deal('wave')}
                    style={{
                        fontSize: isTablet ? '12px' : '14px',
                        padding: isTablet ? '6px 8px' : '8px 12px',
                        height: isTablet ? '32px' : '36px',
                        minHeight: isTablet ? '32px' : '36px',
                        flex: 'none'
                    }}
                >
                    Deal(wave)
                </button>
                <button
                    onClick={() => deal('explosion')}
                    style={{
                        fontSize: isTablet ? '12px' : '14px',
                        padding: isTablet ? '6px 8px' : '8px 12px',
                        height: isTablet ? '32px' : '36px',
                        minHeight: isTablet ? '32px' : '36px',
                        flex: 'none'
                    }}
                >
                    Deal(explosion)
                </button>
                <button
                    onClick={handleGameOver}
                    style={{
                        fontSize: isTablet ? '12px' : '14px',
                        padding: isTablet ? '6px 8px' : '8px 12px',
                        height: isTablet ? '32px' : '36px',
                        minHeight: isTablet ? '32px' : '36px',
                        flex: 'none'
                    }}
                >
                    GameOver
                </button>
                <button
                    onClick={createGameOverEvent}
                    style={{
                        fontSize: isTablet ? '12px' : '14px',
                        padding: isTablet ? '6px 8px' : '8px 12px',
                        height: isTablet ? '32px' : '36px',
                        minHeight: isTablet ? '32px' : '36px',
                        flex: 'none'
                    }}
                >
                    Play Over
                </button>
            </div>
        );
    }, [gameState, screenSize, handleDeal]);


    return (
        <div
            ref={containerRef}
            className="solo-player-container"
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0,
                backgroundColor: '#0d5f0d',
                overflow: 'visible' // 允许拖拽元素超出边界
            }}
        >
            {renderControlPanel()}
            {renderFoundations()}
            {renderTalon()}
            {renderWaste()}
            {renderTableau()}
            {renderCards}

            {/* Three.js 3D弹跳图层 */}
            {boardDimension && (
                <ThreeJsBounceLayer
                    boardDimension={boardDimension}
                    onAnimationComplete={() => {
                        console.log('🎊 Three.js bounce animation completed');
                    }}
                />
            )}

        </div>
    );
};

export default SoloPlayer;
