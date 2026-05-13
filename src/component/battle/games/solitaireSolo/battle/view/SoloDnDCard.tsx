/**
 * 单人纸牌游戏可拖拽卡牌组件（Pointer Events）
 */
import React, { useCallback, useMemo } from 'react';
import { useSoloGameManager } from '../service/GameManager';
import { useSoloDnDManager } from '../service/SoloDnDProvider';
import { ActMode, SoloCard } from '../types/SoloTypes';
import './card.css';

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
    const { ruleManager } = useSoloGameManager();

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

    const load = useCallback((ele: HTMLDivElement | null) => {
        card.ele = ele;
    }, [card]);

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
