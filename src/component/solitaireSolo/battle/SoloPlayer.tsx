/**
 * 单人纸牌游戏主界面组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useEventManager } from './service/EventProvider';
import { useSoloDnDManager } from './service/SoloDnDProvider';
import { useSoloGameManager } from './service/SoloGameManager';
import './style.css';
import { SoloBoardDimension, SoloCard } from './types/SoloTypes';
import SoloDnDCard from './view/SoloDnDCard';

interface SoloPlayerProps {
    onGameComplete?: (won: boolean, score: number) => void;
    onGameStart?: () => void;
    onGamePause?: () => void;
    onGameResume?: () => void;
}

const SoloPlayer: React.FC<SoloPlayerProps> = ({
    onGameComplete,
    onGameStart,
    onGamePause,
    onGameResume
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        gameState,
        boardDimension,
        isGameActive,
        isPaused,
        startNewGame,
        pauseGame,
        resumeGame,
        resetGame,
        drawCard,
        moveCard,
        selectCard,
        getHints,
        autoComplete,
        isGameWon,
        isGameLost,
        getCardsByZone,
        getCardsByZoneType,
        updateBoardDimension
    } = useSoloGameManager();
    const { addEvent } = useEventManager();
    const { isDragging, dragData } = useSoloDnDManager();

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
        const cardHeight = finalCardWidth * 1.4;
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

    // 处理新游戏
    const handleNewGame = useCallback(() => {
        console.log("handleNewGame")
        startNewGame();
        onGameStart?.();
    }, [startNewGame, onGameStart]);
    const handleInitGame = useCallback(() => {
        console.log("handleInitGame")
        addEvent({
            id: Date.now().toString(),
            name: "gameInit",
            data: {
                time: Date.now()
            }
        });
    }, [addEvent]);
    // 处理暂停/恢复
    const handlePauseToggle = useCallback(() => {
        if (isPaused) {
            resumeGame();
            onGameResume?.();
        } else {
            pauseGame();
            onGamePause?.();
        }
    }, [isPaused, pauseGame, resumeGame, onGamePause, onGameResume]);

    // 处理抽牌
    const handleDrawCard = useCallback(() => {
        drawCard();
    }, [drawCard]);

    // 处理卡牌点击
    const handleCardClick = useCallback((card: SoloCard) => {
        selectCard(card);
    }, [selectCard]);

    // 处理卡牌双击
    const handleCardDoubleClick = useCallback((card: SoloCard) => {
        // 双击自动移动到合适位置
        console.log('Double click on card:', card.id);
    }, []);

    // 处理提示
    const handleGetHints = useCallback(() => {
        const hints = getHints();
        console.log('Hints:', hints);
    }, [getHints]);

    // 处理自动完成
    const handleAutoComplete = useCallback(() => {
        autoComplete();
    }, [autoComplete]);

    // 渲染基础堆
    const renderFoundations = useCallback(() => {
        if (!gameState || !boardDimension) return null;

        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        return suits.map((suit, index) => {
            const foundationCards = getCardsByZone(`foundation-${suit}`);
            return (
                <div
                    key={`foundation-${suit}`}
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
                    {foundationCards.length > 0 ? (
                        <SoloDnDCard
                            card={foundationCards[foundationCards.length - 1]}
                            source={`foundation-${suit}`}
                            onClick={handleCardClick}
                            onDoubleClick={handleCardDoubleClick}
                            style={getUnifiedCardStyle({
                                position: 'relative'
                            })}
                        />
                    ) : (
                        <div style={{ color: '#999', fontSize: '12px' }}>
                            {suit.toUpperCase()}
                        </div>
                    )}
                </div>
            );
        });
    }, [gameState, boardDimension, handleCardClick, handleCardDoubleClick, getCardsByZone, getUnifiedCardStyle]);

    // 渲染牌堆
    const renderTalon = useCallback(() => {
        if (!gameState || !boardDimension) return null;

        const talonCards = getCardsByZone('talon');
        return (
            <div
                className="talon-zone"
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
                onClick={handleDrawCard}
            >
                {talonCards.length > 0 ? (
                    <div style={{ color: '#999', fontSize: '12px' }}>
                        {talonCards.length}
                    </div>
                ) : (
                    <div style={{ color: '#999', fontSize: '12px' }}>
                        EMPTY
                    </div>
                )}
            </div>
        );
    }, [gameState, boardDimension, handleDrawCard, getCardsByZone]);

    // 渲染废牌堆
    const renderWaste = useCallback(() => {
        if (!gameState || !boardDimension) return null;

        const wasteCards = getCardsByZone('waste');
        return (
            <div
                className="waste-zone"
                style={{
                    position: 'absolute',
                    left: boardDimension.zones.waste.x,
                    top: boardDimension.zones.waste.y,
                    width: boardDimension.zones.waste.width,
                    height: boardDimension.cardHeight
                }}
            >
                {wasteCards.slice(-3).map((card, index) => (
                    <SoloDnDCard
                        key={card.id}
                        card={card}
                        source="waste"
                        onClick={handleCardClick}
                        onDoubleClick={handleCardDoubleClick}
                        style={getUnifiedCardStyle({
                            position: 'absolute', // 改为绝对定位，与 tableau 一致
                            left: index * (boardDimension.cardWidth * 0.55),
                            top: 0,
                        })}
                    />
                ))}
            </div>
        );
    }, [gameState, boardDimension, handleCardClick, handleCardDoubleClick, getCardsByZone, getUnifiedCardStyle]);

    // 渲染牌桌
    const renderTableau = useCallback(() => {
        if (!boardDimension) return null;
        // console.log('boardDimension', boardDimension);
        return Array.from({ length: 7 }, (_, colIndex) => {
            const columnCards = getCardsByZone(`tableau-${colIndex}`);
            return (
                <div
                    key={`tableau-col-${colIndex}`}
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
                    {columnCards.map((card, cardIndex) => (
                        <SoloDnDCard
                            key={card.id}
                            card={card}
                            source={`tableau-${colIndex}`}
                            onClick={handleCardClick}
                            onDoubleClick={handleCardDoubleClick}
                            style={getUnifiedCardStyle({
                                position: 'absolute',
                                top: cardIndex * (boardDimension.cardHeight * 0.3),
                            })}
                        />
                    ))}
                </div>
            );
        });
    }, [boardDimension, handleCardClick, handleCardDoubleClick, getCardsByZone, getUnifiedCardStyle]);

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
                    onClick={handleNewGame}
                    disabled={isGameActive && !isPaused}
                    style={{
                        fontSize: isMobile ? '12px' : '14px',
                        padding: isMobile ? '6px 8px' : '8px 12px',
                        height: isMobile ? '32px' : '36px', // 固定高度
                        minHeight: isMobile ? '32px' : '36px',
                    }}
                >
                    {isGameActive ? 'Restart' : 'New Game'}
                </button>
                {isGameActive && (
                    <button
                        onClick={handlePauseToggle}
                        style={{
                            fontSize: isMobile ? '12px' : '14px',
                            padding: isMobile ? '6px 8px' : '8px 12px',
                            height: isMobile ? '32px' : '36px',
                            minHeight: isMobile ? '32px' : '36px',
                            flex: 'none'
                        }}
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                )}
                <button
                    onClick={handleGetHints}
                    disabled={!isGameActive || isPaused}
                    style={{
                        fontSize: isMobile ? '12px' : '14px',
                        padding: isMobile ? '6px 8px' : '8px 12px',
                        height: isMobile ? '32px' : '36px',
                        minHeight: isMobile ? '32px' : '36px',
                        flex: 'none'
                    }}
                >
                    Hints
                </button>
                {!isMobile && (
                    <button
                        onClick={handleInitGame}
                        style={{
                            fontSize: isTablet ? '12px' : '14px',
                            padding: isTablet ? '6px 8px' : '8px 12px',
                            height: isTablet ? '32px' : '36px',
                            minHeight: isTablet ? '32px' : '36px',
                            flex: 'none'
                        }}
                    >
                        Init Game
                    </button>
                )}
            </div>
        );
    }, [isGameActive, isPaused, screenSize, handleNewGame, handlePauseToggle, handleGetHints, handleAutoComplete]);

    // 渲染游戏信息
    const renderGameInfo = useCallback(() => {
        if (!gameState) return null;

        const isMobile = screenSize === 'mobile';
        const isTablet = screenSize === 'tablet';

        return (
            <div className="game-info" style={{
                display: 'flex',
                gap: isMobile ? '10px' : '5px',
                zIndex: 1000,
                color: '#333',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '4px 8px',
                borderRadius: '4px'
            }}>
                <div>Score: {gameState.score}</div>
                <div>Moves: {gameState.moves}</div>
                <div>Time: {Math.floor(gameState.timeElapsed / 60)}:{(gameState.timeElapsed % 60).toString().padStart(2, '0')}</div>
            </div>
        );
    }, [gameState, screenSize]);

    // 渲染游戏状态
    const renderGameStatus = useCallback(() => {
        if (!isGameActive) return null;

        if (isGameWon()) {
            return (
                <div className="game-status won" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(76, 175, 80, 0.9)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    zIndex: 2000
                }}>
                    <h2>Congratulations!</h2>
                    <p>You won the game!</p>
                    <p>Score: {gameState?.score}</p>
                    <button onClick={handleNewGame}>Play Again</button>
                </div>
            );
        }

        if (isGameLost()) {
            return (
                <div className="game-status lost" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(244, 67, 54, 0.9)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    zIndex: 2000
                }}>
                    <h2>Game Over</h2>
                    <p>No more moves available</p>
                    <button onClick={handleNewGame}>Try Again</button>
                </div>
            );
        }

        if (isPaused) {
            return (
                <div className="game-status paused" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    zIndex: 2000
                }}>
                    <h2>Game Paused</h2>
                    <button onClick={handlePauseToggle}>Resume</button>
                </div>
            );
        }

        return null;
    }, [isGameActive, isGameWon, isGameLost, isPaused, gameState, handleNewGame, handlePauseToggle]);
    // console.log('boardDimension', boardDimension);
    return (
        <div
            ref={containerRef}
            className="solo-player-container"
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                backgroundColor: '#0d5f0d',
                overflow: 'visible' // 允许拖拽元素超出边界
            }}
        >
            {renderControlPanel()}
            {renderGameInfo()}
            {renderFoundations()}
            {renderTalon()}
            {renderWaste()}
            {renderTableau()}
            {renderGameStatus()}
            {/* 渲染被拖拽的卡牌序列 */}

        </div>
    );
};

export default SoloPlayer;
