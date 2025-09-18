/**
 * 单人纸牌游戏可拖拽卡牌组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSoloDnDManager } from '../service/SoloDnDProvider';
import { useSoloGameManager } from '../service/SoloGameManager';
import { SoloCard } from '../types/SoloTypes';

interface SoloDnDCardProps {
    card: SoloCard;
    source: string; // 来源位置标识
    isSelected?: boolean;
    isHinted?: boolean;
    onClick?: (card: SoloCard) => void;
    onDoubleClick?: (card: SoloCard) => void;
    style?: React.CSSProperties;
    className?: string;
}

const SoloDnDCard: React.FC<SoloDnDCardProps> = ({
    card,
    source,
    isSelected = false,
    isHinted = false,
    onClick,
    onDoubleClick,
    style,
    className = ''
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isTouching, setIsTouching] = useState(false);
    const [touchStartTime, setTouchStartTime] = useState<number>(0);
    const {
        isDragging,
        dragData,
        isTouchDevice,
        isTransitioning,
        onDragStart,
        onDragOver,
        onDrop
    } = useSoloDnDManager();
    const { selectCard, canMoveCard } = useSoloGameManager();

    // 检查是否正在被拖拽或处于过渡状态
    const isBeingDragged = useMemo(() => {
        return isDragging && dragData?.card.id === card.id;
    }, [isDragging, dragData, card.id]);

    const isInTransition = useMemo(() => {
        return isTransitioning && dragData?.card.id === card.id;
    }, [isTransitioning, dragData, card.id]);

    // 检查是否可以移动
    const canMove = useMemo(() => {
        return canMoveCard(card, source);
    }, [canMoveCard, card, source]);

    // 获取卡牌样式
    const cardStyle = useMemo(() => {
        const baseStyle: React.CSSProperties = {
            width: '60px',
            height: '84px',
            borderRadius: '8px',
            border: '2px solid #333',
            backgroundColor: card.isRevealed ? '#fff' : '#1a4d80',
            position: 'relative',
            cursor: canMove ? 'grab' : 'default',
            transition: 'all 0.2s ease',
            transform: isBeingDragged ? 'rotate(5deg) scale(1.1)' : isTouching ? 'scale(1.05)' : 'none',
            zIndex: isBeingDragged || isInTransition ? 9999 : card.zIndex || 1,
            opacity: isBeingDragged ? 0.8 : isTouching ? 0.9 : 1,
            boxShadow: isSelected
                ? '0 0 10px #4CAF50'
                : isHinted
                    ? '0 0 10px #FFC107'
                    : isTouching
                        ? '0 0 8px #2196F3'
                        : isHovered
                            ? '0 0 5px #666'
                            : '0 2px 4px rgba(0,0,0,0.3)',
            ...style
        };

        return baseStyle;
    }, [card, isBeingDragged, isInTransition, isSelected, isHinted, isHovered, isTouching, canMove, style]);

    // 处理鼠标事件
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!canMove || !card.isRevealed) return;
        e.preventDefault();
        onDragStart(card, e);
    }, [canMove, card, onDragStart]);

    const handleMouseOver = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        onDragOver(e);
    }, [isDragging, onDragOver]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        onDrop(e);
    }, [isDragging, onDrop]);

    // 处理触摸事件
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!canMove || !card.isRevealed) return;

        // 防止触摸时的默认行为（如滚动）
        e.preventDefault();

        // 设置触摸状态
        setIsTouching(true);
        setTouchStartTime(Date.now());

        // 获取触摸点信息
        const touch = e.touches[0];
        if (touch) {
            console.log('Touch started on card:', card.id, 'at position:', {
                x: touch.clientX,
                y: touch.clientY,
                pageX: touch.pageX,
                pageY: touch.pageY,
                timestamp: Date.now()
            });
        }

        // 开始拖拽
        onDragStart(card, e);
    }, [canMove, card, onDragStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;

        // 防止触摸移动时的默认行为
        e.preventDefault();

        // 获取触摸点信息
        const touch = e.touches[0];
        if (touch) {
            console.log('Touch moving on card:', card.id, 'to position:', {
                x: touch.clientX,
                y: touch.clientY
            });
        }

        onDragOver(e);
    }, [isDragging, onDragOver, card.id]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;

        // 防止触摸结束时的默认行为
        e.preventDefault();

        // 计算触摸持续时间
        const touchDuration = Date.now() - touchStartTime;

        // 重置触摸状态
        setIsTouching(false);
        setTouchStartTime(0);

        console.log('Touch ended on card:', card.id, 'duration:', touchDuration + 'ms');

        onDrop(e);
    }, [isDragging, onDrop, card.id, touchStartTime]);

    const handleTouchCancel = useCallback((e: React.TouchEvent) => {
        // 触摸被取消（如被系统中断）
        console.log('Touch cancelled on card:', card.id);

        // 重置触摸状态
        setIsTouching(false);
        setTouchStartTime(0);

        // 如果正在拖拽，则结束拖拽
        if (isDragging) {
            onDrop(e);
        }
    }, [isDragging, onDrop, card.id]);

    // 处理点击事件
    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (card.isRevealed) {
            selectCard(card);
            onClick?.(card);
        }
    }, [card, selectCard, onClick]);

    // 处理双击事件
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (card.isRevealed) {
            onDoubleClick?.(card);
        }
    }, [card, onDoubleClick]);

    // 处理悬停事件
    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    // 渲染卡牌内容
    const renderCardContent = useCallback(() => {
        if (!card.isRevealed) {
            return (
                <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(45deg, #1a4d80, #2c5aa0)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                }}>
                    ♠
                </div>
            );
        }

        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px',
                position: 'relative'
            }}>
                {/* 左上角数字和花色 */}
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: card.isRed ? '#d32f2f' : '#000'
                }}>
                    {card.rank}
                </div>

                {/* 中心花色 */}
                <div style={{
                    fontSize: '24px',
                    color: card.isRed ? '#d32f2f' : '#000',
                    marginTop: '8px'
                }}>
                    {getSuitSymbol(card.suit)}
                </div>

                {/* 右下角数字和花色 */}
                <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: card.isRed ? '#d32f2f' : '#000',
                    transform: 'rotate(180deg)'
                }}>
                    {card.rank}
                </div>
            </div>
        );
    }, [card]);

    // 获取花色符号
    const getSuitSymbol = useCallback((suit: string) => {
        const symbols = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };
        return symbols[suit as keyof typeof symbols] || '?';
    }, []);

    // 更新卡牌元素引用
    useEffect(() => {
        if (ref.current) {
            card.ele = ref.current;
        }
    }, [card]);

    return (
        <div
            ref={ref}
            className={`solo-card ${className} ${isSelected ? 'selected' : ''} ${isHinted ? 'hinted' : ''} ${!card.isRevealed ? 'face-down' : ''}`}
            style={cardStyle}
            onMouseDown={handleMouseDown}
            onMouseOver={handleMouseOver}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-card-id={card.id}
            data-source={source}
            data-revealed={card.isRevealed}
        >
            {renderCardContent()}
        </div>
    );
};

export default SoloDnDCard;
