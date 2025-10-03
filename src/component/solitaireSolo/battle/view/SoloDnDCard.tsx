/**
 * 单人纸牌游戏可拖拽卡牌组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { gsap } from 'gsap';
import React, { useCallback, useMemo, useState } from 'react';
import { useSoloGameManager } from '../service/GameManager';
import { useSoloDnDManager } from '../service/SoloDnDProvider';
import { SoloCard } from '../types/SoloTypes';
import './card.css';

import { getCoord } from '../Utils';
import CardSVG from './CardSVG';
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
    const { selectCard, boardDimension } = useSoloGameManager();

    // 检查是否正在被拖拽或处于过渡状态
    const isBeingDragged = useMemo(() => {
        return isDragging && dragData?.card.id === card.id;
    }, [isDragging, dragData, card.id]);

    const isInTransition = useMemo(() => {
        return isTransitioning && dragData?.card.id === card.id;
    }, [isTransitioning, dragData, card.id]);

    // 获取游戏管理器（在组件顶层调用Hook）
    // const { getCardsByZone, getMovableSequence } = useSoloGameManager();

    // 检查是否可以移动 - 只要是翻开的卡牌就可以尝试拖拽
    const canMove = useMemo(() => {
        return card.isRevealed;
    }, [card.isRevealed]);
    // console.log("style", source, card, style);
    // 获取卡牌样式
    const cardStyle = useMemo(() => {
        const baseStyle: React.CSSProperties = {
            // 移除硬编码尺寸，让外部样式控制
            // width: '60px',
            // height: '84px',
            // minHeight: '84px', // 完全移除，让外部控制
            // borderRadius: '8px',
            // border: '2px solid #333',
            // backgroundColor: card.isRevealed ? '#fff' : '#1a4d80',
            // transformStyle: 'preserve-3d',
            // backfaceVisibility: 'hidden',
            // position: 'absolute',
            // left: 0,
            // top: 0,
            // cursor: canMove ? 'grab' : 'default',
            // transition: 'all 0.2s ease',
            // transform: isTouching ? 'scale(1.05)' : 'none',
            // zIndex: isBeingDragged || isInTransition ? 9999 : card.zIndex || 1,
            // overflow: 'hidden', // 确保内容不会溢出
            // boxShadow: isSelected
            //     ? '0 0 10px #4CAF50'
            //     : isHinted
            //         ? '0 0 10px #FFC107'
            //         : isTouching
            //             ? '0 0 8px #2196F3'
            //             : isHovered
            //                 ? '0 0 5px #666'
            //                 : '0 2px 4px rgba(0,0,0,0.3)',
            // 外部样式优先级更高
            ...style
        };

        return baseStyle;
    }, [card, isBeingDragged, isInTransition, isSelected, isHinted, isHovered, isTouching, canMove, style]);

    // 处理鼠标事件
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!card.isRevealed) return;
        e.preventDefault();
        onDragStart(card, e);
    }, [canMove, card, onDragStart]);

    const handleMouseOver = useCallback((e: React.MouseEvent) => {
        console.log('Mouse over on card:', card.id);
        if (card.ele) {
            document.body.style.cursor = 'grab';
        }
        if (!isDragging) return;
        onDragOver(e);
    }, [isDragging, onDragOver]);


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

        // onDrop(e);
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
        if (card.ele) {
            document.body.style.cursor = 'default';
        }
        // setIsHovered(false);
    }, []);



    // 更新卡牌元素引用

    const load = useCallback((ele: HTMLDivElement | null) => {
        if (!boardDimension) return;
        card.ele = ele;
        if (ele) {
            const coord = getCoord(card, boardDimension);
            gsap.set(ele, { autoAlpha: 1, x: coord.x, y: coord.y });
        }
        // onCardLoad(ele);
    }, [boardDimension]);
    return (
        <div
            ref={(ele) => load(ele)}
            data-card-id={card.id}
            className="card"
            // className={`solo-card ${className} ${isSelected ? 'selected' : ''} ${isHinted ? 'hinted' : ''} ${!card.isRevealed ? 'face-down' : ''}`}
            style={cardStyle}
            onMouseDown={handleMouseDown}
            onMouseOver={handleMouseOver}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* {renderCardContent()} */}
            {/* <CardSolo card={card} /> */}
            <CardSVG card={card} />
            {/* {renderCardContent()} */}

        </div>
    );
};

export default SoloDnDCard;
