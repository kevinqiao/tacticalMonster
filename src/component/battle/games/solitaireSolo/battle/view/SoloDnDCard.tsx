/**
 * 单人纸牌游戏可拖拽卡牌组件（Pointer Events）
 */
import React, { useCallback, useMemo } from 'react';
import { useSoloDnDManager } from '../service/SoloDnDProvider';
import { SoloCard } from '../types/SoloTypes';
import './card.css';

import CardSVG from './CardSVG';
interface SoloDnDCardProps {
    card: SoloCard;
    style?: React.CSSProperties;
    className?: string;
    /** 牌 DOM 挂载/卸载时通知父级重跑布局（card.ele 变更不触发 React state） */
    onCardDomChange?: () => void;
}

const SoloDnDCard: React.FC<SoloDnDCardProps> = ({
    card,
    style,
    className = '',
    onCardDomChange,
}) => {
    const { onPointerDragStart } = useSoloDnDManager();

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

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const load = useCallback(
        (ele: HTMLDivElement | null) => {
            const hadEle = card.ele != null;
            card.ele = ele;
            if (ele && !hadEle) {
                onCardDomChange?.();
            }
        },
        [card, onCardDomChange]
    );

    return (
        <div
            ref={(ele) => load(ele)}
            data-card-id={card.id}
            className={`card ${className}`.trim()}
            style={cardStyle}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            <CardSVG card={card} />
        </div>
    );
};

export default SoloDnDCard;
