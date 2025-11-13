/**
 * 单人纸牌游戏可拖拽卡牌组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { gsap } from 'gsap';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSoloGameManager } from '../service/GameManager';
import { useSoloDnDManager } from '../service/SoloDnDProvider';
import { ActMode, SoloCard } from '../types/SoloTypes';
import './card.css';

import { popCard } from '../animation/effects/popCard';
import { getCoord } from '../Utils';
import CardSVG from './CardSVG';
interface SoloDnDCardProps {
    card: SoloCard;
    onClick?: (card: SoloCard) => void;
    onDoubleClick?: (card: SoloCard) => void;
    style?: React.CSSProperties;
    className?: string;
}

const SoloDnDCard: React.FC<SoloDnDCardProps> = ({
    card,
    onClick,
    onDoubleClick,
    style,
    className = ''
}) => {


    const [touchStartTime, setTouchStartTime] = useState<number>(0);
    const {
        // dragData,
        onDragStart,
    } = useSoloDnDManager();
    const { ruleManager, gameState, boardDimension, boardDimensionRef, isPlaying } = useSoloGameManager();


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
    }, [card, style]);

    // 处理鼠标事件
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // if (!card.isRevealed) return;
        e.preventDefault();
        e.stopPropagation();
        // if (card.ele) {
        //     document.body.style.cursor = 'grab';
        // }
        onDragStart(card, e);
    }, [card, onDragStart]);

    const handleMouseOver = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const actModes = ruleManager?.getActModes(card) || [];
        if (actModes.includes(ActMode.DRAG)) {
            document.body.style.cursor = 'grab';
        }

        // onDragOver(e);
    }, [ruleManager, card]);


    // 处理触摸事件
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!card.isRevealed) return;

        // 防止触摸时的默认行为（如滚动）
        e.preventDefault();

        // 设置触摸状态       
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
    }, [card, onDragStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {

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

        // onDragOver(e);
    }, [card.id]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {

        // 防止触摸结束时的默认行为    
        e.preventDefault();

        // onDrop(e);
    }, []);

    const handleTouchCancel = useCallback((e: React.TouchEvent) => {
        // 触摸被取消（如被系统中断）
        console.log('Touch cancelled on card:', card.id);

        // 重置触摸状态
        // setIsTouching(false);
        setTouchStartTime(0);

        // 如果正在拖拽，则结束拖拽

    }, [card.id]);

    // 处理点击事件
    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // console.log("click", card)

    }, [card]);

    // 处理双击事件
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

    }, [card]);

    // 处理悬停事件
    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // console.log('handleMouseEnter', card);
        const actModes = ruleManager?.getActModes(card) || [];
        if (actModes.includes(ActMode.DRAG)) {
            document.body.style.cursor = 'grab';
        }
        // if (card.ele) {
        //     document.body.style.cursor = 'grab';
        // }
    }, [ruleManager, card]);

    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        document.body.style.cursor = 'default';
        // setIsHovered(false);
    }, []);



    // 更新卡牌元素引用
    const initCard = useCallback(() => {
        if (!boardDimension || !boardDimensionRef.current || !card.ele) return;
        const width = boardDimension.cardWidth;
        const height = boardDimension.cardHeight;
        // console.log('load card:', card.id);
        const zoneCards = gameState?.cards.filter((c: SoloCard) => c.zoneId === card.zoneId) || [];
        // zoneCards.sort((a, b) => a.zoneIndex - b.zoneIndex);
        const coord = getCoord(card, zoneCards, boardDimensionRef);
        const rotateY = card.isRevealed ? 180 : 0;
        const rotateZ = card.isRevealed && card.zone === "talon" ? 0 : -20;
        popCard(card);
        gsap.set(card.ele, { autoAlpha: 1, width, height, x: coord.x, y: coord.y, rotateZ: 0, rotateY, zIndex: card.zoneIndex + 10 });

    }, [card, gameState, boardDimension, boardDimensionRef]);
    const load = useCallback((ele: HTMLDivElement | null) => {
        card.ele = ele;
    }, []);
    useEffect(() => {
        if (card.ele && boardDimension && !isPlaying(card)) {
            if (card.zoneId === 'waste')
                console.log("waste card", card);
            initCard();
        }
    }, [card, gameState, boardDimension]);

    const render = useMemo(() => {

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
    }, [card]);
    return render;
};

export default SoloDnDCard;
