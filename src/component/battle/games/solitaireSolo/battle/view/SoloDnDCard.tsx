/**
 * 单人纸牌游戏可拖拽卡牌组件（Pointer Events）
 */
import { gsap } from 'gsap';
import React, { useCallback, useEffect, useMemo } from 'react';
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
    const { onPointerDragStart } = useSoloDnDManager();
    const { ruleManager, gameState, boardDimension, boardDimensionRef, isPlaying } = useSoloGameManager();

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
        const coord = getCoord(card, zoneCards, boardDimensionRef);
        const rotateY = card.isRevealed && card.zone !== "talon" ? 180 : 0;
        popCard(card);
        gsap.set(card.ele, { autoAlpha: 1, width, height, x: coord.x, y: coord.y, rotateY, zIndex: card.zoneIndex + 10 });

    }, [card, gameState, boardDimension, boardDimensionRef]);
    const load = useCallback((ele: HTMLDivElement | null) => {
        card.ele = ele;
    }, [card]);
    useEffect(() => {
        if (card.ele && boardDimension && !isPlaying(card)) {
            if (card.zoneId === 'waste')
                console.log("waste card", card);
            initCard();
        }
    }, [card, gameState, boardDimension, initCard, isPlaying]);

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
