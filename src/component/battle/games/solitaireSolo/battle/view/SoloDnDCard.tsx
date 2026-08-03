/**
 * 单人纸牌游戏可拖拽卡牌组件（Pointer Events）
 */
import React, { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useSoloDnDManager } from "../service/SoloDnDProvider";
import { useSoloGameManager } from "../service/GameManager";
import { ActMode, SoloCard } from "../types/SoloTypes";
import "./card.css";

import CardSVG from "./CardSVG";

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
    className = "",
    onCardDomChange,
}) => {
    const { onPointerDragStart } = useSoloDnDManager();
    const { ruleManager } = useSoloGameManager();
    const onCardDomChangeRef = useRef(onCardDomChange);
    onCardDomChangeRef.current = onCardDomChange;

    const canDrag = useMemo(() => {
        if (!ruleManager) return false;
        return ruleManager.getActModes(card, { forAffordance: true }).includes(ActMode.DRAG);
    }, [ruleManager, card, card.isRevealed, card.zone, card.zoneId, card.zoneIndex]);

    const cardStyle = useMemo(() => {
        const baseStyle: React.CSSProperties = {
            ...style,
        };
        return baseStyle;
    }, [style]);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onPointerDragStart(card, e);
        },
        [card, onPointerDragStart]
    );

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    /**
     * Ignore ref(null) from callback-identity churn (parent re-render creates a new
     * `ref={fn}` each time). Clearing ele there + notifying parent caused update loops.
     * True unmount clears via layout effect cleanup.
     */
    const setEleRef = useCallback(
        (ele: HTMLDivElement | null) => {
            if (!ele) return;
            const wasMissing = card.ele == null;
            card.ele = ele;
            if (wasMissing) {
                onCardDomChangeRef.current?.();
            }
        },
        [card]
    );

    useLayoutEffect(() => {
        return () => {
            card.ele = null;
        };
    }, [card]);

    return (
        <div
            ref={setEleRef}
            data-card-id={card.id}
            className={`card ${canDrag ? "card--interactive" : ""} ${className}`.trim()}
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
