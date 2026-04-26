/**
 * 单人纸牌游戏可拖拽卡牌组件（Pointer Events）
 */
import { gsap } from 'gsap';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useSoloGameManager } from '../service/GameManager';
import { useSoloDnDManager } from '../service/SoloDnDProvider';
import { ActMode, GameInteractionPhase, SoloCard, ZoneType } from '../types/SoloTypes';
import './card.css';

import { popCard } from '../animation/effects/popCard';
import { getCardCoord, tableauCardZIndex } from '../Utils';
import CardSVG from './CardSVG';
interface SoloDnDCardProps {
    card: SoloCard;
    style?: React.CSSProperties;
    className?: string;
}

const SoloDnDCard: React.FC<SoloDnDCardProps> = ({
    card,
    style,
    className = ''
}) => {
    const { onPointerDragStart } = useSoloDnDManager();
    const { ruleManager, gameState, boardDimension, boardDimensionRef, interactionPhase } = useSoloGameManager();

    const cardStyle = useMemo(() => {
        const baseStyle: React.CSSProperties = {
            ...style
        };
        return baseStyle;
    }, [style]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onPointerDragStart(card, e);
    }, [card, onPointerDragStart]);

    const handlePointerEnter = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        const actModes = ruleManager?.getActModes(card) || [];
        if (actModes.includes(ActMode.DRAG)) {
            document.body.style.cursor = 'grab';
        }
    }, [ruleManager, card]);

    const handlePointerLeave = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        document.body.style.cursor = 'default';
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const initCard = useCallback(() => {
        if (!boardDimension || !boardDimensionRef.current || !card.ele) return;
        const width = boardDimension.cardWidth;
        const height = boardDimension.cardHeight;
        const zoneCards = gameState?.cards.filter((c: SoloCard) => c.zoneId === card.zoneId) || [];
        const coord = getCardCoord(card, zoneCards, boardDimensionRef);
        const rotateY = card.isRevealed && card.zone !== "talon" ? 180 : 0;
        popCard(card);
        const stackZ =
            card.zone === ZoneType.TABLEAU
                ? tableauCardZIndex(card.zoneId, card.zoneIndex)
                : card.zoneIndex + 10;
        // 与上一帧动画末位置一致时不再强写 x/y，避免多写一次 transform 引闪
        const cx = Number(gsap.getProperty(card.ele, "x"));
        const cy = Number(gsap.getProperty(card.ele, "y"));
        const samePos =
            Number.isFinite(cx) &&
            Number.isFinite(cy) &&
            Math.hypot(cx - coord.x, cy - coord.y) < 1.2;
        if (samePos) {
            gsap.set(card.ele, { autoAlpha: 1, width, height, rotateY, zIndex: stackZ });
        } else {
            gsap.set(card.ele, { autoAlpha: 1, width, height, x: coord.x, y: coord.y, rotateY, zIndex: stackZ });
        }

    }, [card, gameState, boardDimension, boardDimensionRef]);
    const load = useCallback((ele: HTMLDivElement | null) => {
        card.ele = ele;
    }, [card]);
    useEffect(() => {
        // animating / pointerDrag 时不要用旧 gameState 抢写 GSAP，否则合法落子会从「模型起点」再播一遍
        if (
            card.ele &&
            boardDimension &&
            interactionPhase === GameInteractionPhase.idle
        ) {
            initCard();
        }
    }, [card, gameState, boardDimension, initCard, interactionPhase]);

    return (
        <div
            ref={(ele) => load(ele)}
            data-card-id={card.id}
            className={`card ${className}`.trim()}
            style={cardStyle}
            onPointerDown={handlePointerDown}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            <CardSVG card={card} />
        </div>
    );
};

export default SoloDnDCard;
