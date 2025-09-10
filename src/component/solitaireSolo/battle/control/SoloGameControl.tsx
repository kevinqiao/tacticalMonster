/**
 * 单人纸牌游戏控制组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSoloDnDManager } from '../service/SoloDnDProvider';
import { useSoloGameManager } from '../service/SoloGameManager';
import SoloRuleManager from '../service/SoloRuleManager';
import { SoloCard, SoloMove } from '../types/SoloTypes';

interface SoloGameControlProps {
    onGameComplete?: (won: boolean, score: number) => void;
    onMoveComplete?: (move: SoloMove) => void;
    onHintRequest?: (hints: any[]) => void;
}

const SoloGameControl: React.FC<SoloGameControlProps> = ({
    onGameComplete,
    onMoveComplete,
    onHintRequest
}) => {
    const {
        gameState,
        isGameActive,
        isPaused,
        moveCard,
        selectCard,
        getHints,
        autoComplete,
        isGameWon,
        isGameLost
    } = useSoloGameManager();

    const { isDragging, dragData } = useSoloDnDManager();
    const [selectedCard, setSelectedCard] = useState<SoloCard | null>(null);
    const [ruleManager, setRuleManager] = useState<SoloRuleManager | null>(null);
    const [isProcessingMove, setIsProcessingMove] = useState(false);
    const moveHistoryRef = useRef<SoloMove[]>([]);

    // 初始化规则管理器
    useEffect(() => {
        if (gameState) {
            setRuleManager(new SoloRuleManager(gameState));
        }
    }, [gameState]);

    // 检查游戏状态
    useEffect(() => {
        if (!gameState || !isGameActive) return;

        if (isGameWon()) {
            onGameComplete?.(true, gameState.score);
        } else if (isGameLost()) {
            onGameComplete?.(false, gameState.score);
        }
    }, [gameState, isGameActive, isGameWon, isGameLost, onGameComplete]);

    // 处理卡牌选择
    const handleCardSelect = useCallback((card: SoloCard) => {
        if (isProcessingMove || isDragging) return;

        if (selectedCard && selectedCard.id === card.id) {
            // 取消选择
            setSelectedCard(null);
            selectCard(null);
        } else if (selectedCard) {
            // 尝试移动卡牌
            handleCardMove(selectedCard, card);
        } else {
            // 选择卡牌
            setSelectedCard(card);
            selectCard(card);
        }
    }, [selectedCard, isProcessingMove, isDragging, selectCard]);

    // 处理卡牌移动
    const handleCardMove = useCallback(async (fromCard: SoloCard, toCard: SoloCard) => {
        if (!ruleManager || isProcessingMove) return;

        setIsProcessingMove(true);

        try {
            // 确定移动目标
            const targetLocation = getCardLocation(toCard);
            const sourceLocation = getCardLocation(fromCard);

            if (!targetLocation || !sourceLocation) {
                throw new Error('Invalid card location');
            }

            // 验证移动是否合法
            const isValidMove = ruleManager.validateMove({
                id: `move-${Date.now()}`,
                type: 'move',
                from: sourceLocation,
                to: targetLocation,
                card: fromCard,
                timestamp: Date.now(),
                isValid: false,
                points: 0
            });

            if (!isValidMove) {
                throw new Error('Invalid move');
            }

            // 执行移动
            const success = moveCard(fromCard, sourceLocation, targetLocation);

            if (success) {
                const move: SoloMove = {
                    id: `move-${Date.now()}`,
                    type: 'move',
                    from: sourceLocation,
                    to: targetLocation,
                    card: fromCard,
                    timestamp: Date.now(),
                    isValid: true,
                    points: ruleManager.calculateMoveScore({
                        id: `move-${Date.now()}`,
                        type: 'move',
                        from: sourceLocation,
                        to: targetLocation,
                        card: fromCard,
                        timestamp: Date.now(),
                        isValid: true,
                        points: 0
                    })
                };

                moveHistoryRef.current.push(move);
                onMoveComplete?.(move);
            }

            // 清除选择
            setSelectedCard(null);
            selectCard(null);

        } catch (error) {
            console.error('Move failed:', error);
            // 可以显示错误提示
        } finally {
            setIsProcessingMove(false);
        }
    }, [ruleManager, isProcessingMove, moveCard, selectCard, onMoveComplete]);

    // 处理双击自动移动
    const handleCardDoubleClick = useCallback((card: SoloCard) => {
        if (!ruleManager || isProcessingMove) return;

        // 尝试自动移动到基础堆
        for (const foundation of gameState?.foundations || []) {
            if (ruleManager.canMoveToFoundation(card, foundation)) {
                handleCardMove(card, foundation.cards[foundation.cards.length - 1] || card);
                return;
            }
        }

        // 尝试自动移动到牌桌
        for (let col = 0; col < (gameState?.tableau.columns.length || 0); col++) {
            const column = gameState?.tableau.columns[col] || [];
            const targetCard = column.length > 0 ? column[column.length - 1] : null;

            if (ruleManager.canMoveToTableau(card, targetCard, col)) {
                handleCardMove(card, targetCard || card);
                return;
            }
        }
    }, [ruleManager, isProcessingMove, gameState, handleCardMove]);

    // 处理提示请求
    const handleHintRequest = useCallback(() => {
        if (!ruleManager) return;

        const hints = ruleManager.getHints();
        onHintRequest?.(hints);
    }, [ruleManager, onHintRequest]);

    // 处理自动完成
    const handleAutoComplete = useCallback(() => {
        if (!ruleManager) return;

        autoComplete();
    }, [ruleManager, autoComplete]);

    // 处理撤销移动
    const handleUndoMove = useCallback(() => {
        if (moveHistoryRef.current.length === 0) return;

        const lastMove = moveHistoryRef.current.pop();
        if (lastMove) {
            // 这里需要实现撤销逻辑
            console.log('Undo move:', lastMove);
        }
    }, []);

    // 获取卡牌位置
    const getCardLocation = useCallback((card: SoloCard): string | null => {
        if (!gameState) return null;

        // 检查基础堆
        for (const foundation of gameState.foundations) {
            if (foundation.cards.some(c => c.id === card.id)) {
                return foundation.id;
            }
        }

        // 检查废牌堆
        if (gameState.waste.some(c => c.id === card.id)) {
            return 'waste';
        }

        // 检查牌桌
        for (let col = 0; col < gameState.tableau.columns.length; col++) {
            if (gameState.tableau.columns[col].some(c => c.id === card.id)) {
                return `tableau-${col}`;
            }
        }

        return null;
    }, [gameState]);

    // 处理键盘事件
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isGameActive || isPaused) return;

            switch (event.key) {
                case 'h':
                case 'H':
                    handleHintRequest();
                    break;
                case 'u':
                case 'U':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        handleUndoMove();
                    }
                    break;
                case 'a':
                case 'A':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        handleAutoComplete();
                    }
                    break;
                case 'Escape':
                    setSelectedCard(null);
                    selectCard(null);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isGameActive, isPaused, handleHintRequest, handleUndoMove, handleAutoComplete, selectCard]);

    // 处理拖拽结束
    useEffect(() => {
        if (!isDragging && dragData && selectedCard) {
            // 拖拽结束，尝试移动卡牌
            const targetElement = document.elementFromPoint(dragData.x, dragData.y);
            if (targetElement) {
                const targetCard = findCardFromElement(targetElement);
                if (targetCard && targetCard.id !== selectedCard.id) {
                    handleCardMove(selectedCard, targetCard);
                }
            }
        }
    }, [isDragging, dragData, selectedCard, handleCardMove]);

    // 从DOM元素查找卡牌
    const findCardFromElement = useCallback((element: Element): SoloCard | null => {
        const cardElement = element.closest('[data-card-id]');
        if (!cardElement) return null;

        const cardId = cardElement.getAttribute('data-card-id');
        if (!cardId || !gameState) return null;

        // 在所有卡牌中查找
        for (const foundation of gameState.foundations) {
            const card = foundation.cards.find(c => c.id === cardId);
            if (card) return card;
        }

        for (const card of gameState.waste) {
            if (card.id === cardId) return card;
        }

        for (const column of gameState.tableau.columns) {
            const card = column.find(c => c.id === cardId);
            if (card) return card;
        }

        return null;
    }, [gameState]);

    // 渲染控制面板
    const renderControlPanel = useCallback(() => {
        if (!isGameActive) return null;

        return (
            <div className="solo-game-control-panel" style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                display: 'flex',
                gap: '10px',
                zIndex: 1000
            }}>
                <button
                    onClick={handleHintRequest}
                    disabled={isPaused || isProcessingMove}
                    title="Get hints (H)"
                >
                    💡 Hints
                </button>
                <button
                    onClick={handleUndoMove}
                    disabled={isPaused || isProcessingMove || moveHistoryRef.current.length === 0}
                    title="Undo last move (Ctrl+U)"
                >
                    ↶ Undo
                </button>
                <button
                    onClick={handleAutoComplete}
                    disabled={isPaused || isProcessingMove}
                    title="Auto complete (Ctrl+A)"
                >
                    ⚡ Auto
                </button>
            </div>
        );
    }, [isGameActive, isPaused, isProcessingMove, handleHintRequest, handleUndoMove, handleAutoComplete]);

    // 渲染状态指示器
    const renderStatusIndicator = useCallback(() => {
        if (!isGameActive) return null;

        return (
            <div className="solo-game-status" style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                zIndex: 1000
            }}>
                {selectedCard && (
                    <div style={{
                        backgroundColor: 'rgba(76, 175, 80, 0.9)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}>
                        Selected: {selectedCard.rank} of {selectedCard.suit}
                    </div>
                )}
                {isProcessingMove && (
                    <div style={{
                        backgroundColor: 'rgba(255, 152, 0, 0.9)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}>
                        Processing move...
                    </div>
                )}
            </div>
        );
    }, [isGameActive, selectedCard, isProcessingMove]);

    return (
        <>
            {renderControlPanel()}
            {renderStatusIndicator()}
        </>
    );
};

export default SoloGameControl;
