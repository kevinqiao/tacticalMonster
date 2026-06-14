import gsap from "gsap";
import { RefObject } from "react";
import { CARD_SUITS, SoloBoardDimension, SoloCard, SoloGameState, ZoneType } from "./types/SoloTypes";

/**
 * 接龙列在「最厚一摞」的牌间步长之和 + 单牌高度超过槽位可用高度时，按比例压紧垂距，避免整摞超出区底/屏底。
 * 不改动牌面尺寸，只缩 0.3/0.1 的叠放步长；各列用同一倍率，保证最厚一摞刚好装下。
 */
function getTableauVerticalStepScale(
    boardDimension: SoloBoardDimension,
    allCards: SoloCard[]
): number {
    const h = boardDimension.cardHeight;
    const slotH = boardDimension.zones.tableau.height;
    if (h <= 0 || slotH <= 0) return 1;
    // 与 CSS 槽位底边留 1~2px，避免子像素截断看起来「溢出」
    const pad = 1;
    const H = Math.max(0, slotH - pad);
    if (H < h) return 0;

    const baseStep = (c: SoloCard) => 0.2 * h;
    let gMax = 0;
    for (let col = 0; col < 7; col++) {
        const zoneId = `tableau-${col}`;
        const column = allCards
            .filter((c) => c.zone === ZoneType.TABLEAU && c.zoneId === zoneId)
            .sort((a, b) => a.zoneIndex - b.zoneIndex);
        let g = 0;
        for (let i = 0; i < column.length - 1; i++) {
            g += baseStep(column[i]!);
        }
        gMax = Math.max(gMax, g);
    }
    if (gMax <= 0) return 1;
    if (gMax + h <= H) return 1;
    return Math.max(0, (H - h) / gMax);
}

/** Draw 3：waste 区仅铺开最新三张，更早的牌叠在 fan 左端同位置 */
export const SOLITAIRE_WASTE_VISIBLE_FAN = 3;
export const WASTE_FAN_STEP_RATIO = 0.26;
const WASTE_Z_BASE = 2000;

function sortedWastePile(wastePile: SoloCard[], zoneId = "waste"): SoloCard[] {
    return [...wastePile]
        .filter((c) => c.zoneId === zoneId)
        .sort((a, b) => a.zoneIndex - b.zoneIndex);
}

/** 三张 fan 的水平步长（相邻牌可见重叠） */
export function wasteFanStep(cardWidth: number): number {
    return cardWidth * WASTE_FAN_STEP_RATIO;
}

/** waste 槽位宽度 = 三张牌 fan 的总跨度 */
export function wasteZoneFanWidth(cardWidth: number): number {
    const step = wasteFanStep(cardWidth);
    return cardWidth + 2 * step;
}

/** waste 内 pile 序号越大越靠上（顶牌在最上层） */
export function wasteCardZIndex(card: SoloCard, wastePile: SoloCard[]): number {
    const pile = sortedWastePile(wastePile, card.zoneId);
    const idx = pile.findIndex((c) => c.id === card.id);
    return idx < 0 ? WASTE_Z_BASE : WASTE_Z_BASE + idx;
}

export function soloCardZIndex(card: SoloCard, zoneCards?: SoloCard[]): number {
    if (card.zone === ZoneType.TABLEAU) {
        return tableauCardZIndex(card.zoneId, card.zoneIndex);
    }
    if (card.zone === ZoneType.WASTE && zoneCards) {
        return wasteCardZIndex(card, zoneCards);
    }
    return card.zoneIndex + 10;
}

export function getWasteCardCoord(
    card: SoloCard,
    wastePile: SoloCard[],
    wasteZone: { x: number; y: number; width: number; height: number },
    cardWidth: number,
    cardHeight: number
): { x: number; y: number } {
    const pile = sortedWastePile(wastePile, card.zoneId);
    const idx = pile.findIndex((c) => c.id === card.id);
    if (idx < 0) {
        return { x: wasteZone.x, y: wasteZone.y };
    }

    const n = pile.length;
    const fanStart = Math.max(0, n - SOLITAIRE_WASTE_VISIBLE_FAN);
    const fanCount = n - fanStart;
    const y = wasteZone.y + Math.max(0, (wasteZone.height - cardHeight) * 0.5);
    const step = wasteFanStep(cardWidth);

    if (idx < fanStart) {
        return { x: wasteZone.x, y };
    }

    // 较早的 fan 在左，最新顶牌在右（靠近 talon）；右牌 z 更高，盖住左侧
    const pileIdx = idx - fanStart;
    return { x: wasteZone.x + pileIdx * step, y };
}

/** 牌桌单列：zoneIndex 越大越靠上，z 单调递增且列与列之间不重叠 */
export function tableauCardZIndex(zoneId: string, zoneIndex: number): number {
    const col = parseInt(zoneId.split("-")[1] ?? "0", 10);
    const safeCol = Number.isNaN(col) ? 0 : col;
    return 3000 + safeCol * 200 + zoneIndex;
}

/** 按当前 gameState 重算所有区域卡牌的 z-index（修复拖拽临时 zIndex 与移动后叠放） */
export function syncCardStackZIndexFromGameState(gameState: SoloGameState): void {
    const byZone = new Map<string, SoloCard[]>();
    for (const c of gameState.cards) {
        if (!c.ele) continue;
        const list = byZone.get(c.zoneId) ?? [];
        list.push(c);
        byZone.set(c.zoneId, list);
    }
    for (const [, list] of byZone) {
        list.sort((a, b) => a.zoneIndex - b.zoneIndex);
        for (const c of list) {
            if (!c.ele) continue;
            gsap.set(c.ele, { zIndex: soloCardZIndex(c, list) });
        }
    }
}

/** `boardDimensionRef` 或发牌/特效里直接传入的 `boardDimension` 快照 */
export type BoardDimensionSource =
    | RefObject<SoloBoardDimension | null>
    | SoloBoardDimension
    | null
    | undefined;

function resolveBoardDimension(src: BoardDimensionSource): SoloBoardDimension | null {
    if (src == null) return null;
    if (typeof src === "object" && "current" in src) {
        return (src as RefObject<SoloBoardDimension | null>).current ?? null;
    }
    return src as SoloBoardDimension;
}

export const getCardCoord = (card: SoloCard, zoneCards: SoloCard[], boardDimensionSource: BoardDimensionSource) => {
    const boardDimension = resolveBoardDimension(boardDimensionSource);
    if (!boardDimension) return { x: 0, y: 0 };
    switch (card.zone) {
        case ZoneType.TALON: {
            const x = boardDimension.zones.talon.x
            const y = boardDimension.zones.talon.y
            return { x, y };
        }
        case ZoneType.WASTE: {
            return getWasteCardCoord(
                card,
                zoneCards,
                boardDimension.zones.waste,
                boardDimension.cardWidth,
                boardDimension.cardHeight
            );
        }
        case ZoneType.TABLEAU: {
            const colIndex = +card.zoneId.split('-')[1];
            const xs = boardDimension.tableauColX;
            const x =
                Number.isInteger(colIndex) && colIndex >= 0 && colIndex < xs.length
                    ? xs[colIndex]!
                    : boardDimension.zones.tableau.x + colIndex * (boardDimension.cardWidth + boardDimension.spacing);
            const h = boardDimension.cardHeight;

            const vScale = getTableauVerticalStepScale(boardDimension, zoneCards);
            let y = boardDimension.zones.tableau.y
            y = y + card.zoneIndex * 0.2 * h * vScale;
            return { x, y };
        }
        case ZoneType.FOUNDATION: {
            const index = CARD_SUITS.findIndex(suit => suit === card.suit);
            const fxs = boardDimension.foundationColX;
            const x =
                index >= 0 && index < fxs.length
                    ? fxs[index]!
                    : boardDimension.zones.foundations.x + index * (boardDimension.cardWidth + boardDimension.spacing);
            const y = boardDimension.zones.foundations.y
            return { x, y };
        }
        default:
            return { x: 0, y: 0 };
    }
};

// 获取区域优先级
const getZonePriority = (zoneId: string, card: SoloCard) => {
    if (zoneId.startsWith('foundation-')) return 100; // Foundation 最高优先级
    if (zoneId.startsWith('tableau-')) return 50;    // Tableau 中等优先级
    if (zoneId.startsWith('waste-')) return 25;      // Waste 较低优先级
    return 0;
}

/** 主牌 + 跟牌（tableau 串）合并为视口轴对齐包围盒，用于落点检测 */
function unionDragPileClientRect(pile: SoloCard[]): { left: number; right: number; top: number; bottom: number } | null {
    const withEle = pile.filter((c): c is SoloCard & { ele: HTMLElement } => !!c.ele);
    if (withEle.length === 0) return null;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const c of withEle) {
        const r = c.ele.getBoundingClientRect();
        left = Math.min(left, r.left);
        top = Math.min(top, r.top);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
    }
    if (right <= left || bottom <= top) return null;
    return { left, right, top, bottom };
}

// 改进的 findBestDropTarget 函数 - 使用动态卡牌尺寸
export const findBestDropTarget = (
    position: { x: number; y: number },
    card: SoloCard,
    boardDimension: SoloBoardDimension,
    /** 若提供，仅在「规则允许落到该区」的候选里取最优，避免与 foundation 等区域几何重叠时误选高优先级非法区 */
    isLegalDrop?: (zoneId: string) => boolean,
    /** tableau 跟牌与主牌同一 x，垂直叠放；仅测主牌盒时底部可能与目标列无交集，需合并整摞盒 */
    dragFollowers?: SoloCard[] | null
): { zoneId: string; element: Element; priority: number; count: number; area: number } | null => {
    try {
        // 从 boardDimension 获取实际的卡牌尺寸
        const cardWidth = boardDimension.cardWidth;
        const cardHeight = boardDimension.cardHeight;

        const pile = [card, ...(dragFollowers ?? [])];
        const union = unionDragPileClientRect(pile);
        let cardLeft: number;
        let cardRight: number;
        let cardTop: number;
        let cardBottom: number;
        if (union) {
            cardLeft = union.left;
            cardRight = union.right;
            cardTop = union.top;
            cardBottom = union.bottom;
        } else {
            cardLeft = position.x - cardWidth / 2;
            cardRight = position.x + cardWidth / 2;
            cardTop = position.y - cardHeight / 2;
            cardBottom = position.y + cardHeight / 2;
        }

        const DROP_PAD = 14;
        const cx = (cardLeft + cardRight) / 2;
        const cy = (cardTop + cardBottom) / 2;

        const dropZones = document.querySelectorAll('[data-drop-zone]');

        type Hit = { zoneId: string; element: Element; priority: number; area: number; score: number };
        const hits: Hit[] = [];

        const addHitsFromBox = () => {
            dropZones.forEach((zone) => {
                const raw = zone.getBoundingClientRect();
                const zoneId = zone.getAttribute('data-zone-id');
                if (!zoneId) return;

                const r = {
                    left: raw.left - DROP_PAD,
                    right: raw.right + DROP_PAD,
                    top: raw.top - DROP_PAD,
                    bottom: raw.bottom + DROP_PAD,
                };

                const il = Math.max(cardLeft, r.left);
                const ir = Math.min(cardRight, r.right);
                const it = Math.max(cardTop, r.top);
                const ib = Math.min(cardBottom, r.bottom);
                if (il >= ir || it >= ib) return;

                const area = (ir - il) * (ib - it);
                if (area <= 0) return;

                const priority = getZonePriority(zoneId, card);
                const score = priority * 100 + area;
                hits.push({ zoneId, element: zone, priority, area, score });
            });
        };

        addHitsFromBox();

        if (hits.length === 0) {
            dropZones.forEach((zone) => {
                const raw = zone.getBoundingClientRect();
                const zoneId = zone.getAttribute('data-zone-id');
                if (!zoneId) return;
                const r = {
                    left: raw.left - DROP_PAD,
                    right: raw.right + DROP_PAD,
                    top: raw.top - DROP_PAD,
                    bottom: raw.bottom + DROP_PAD,
                };
                if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return;
                const priority = getZonePriority(zoneId, card);
                hits.push({ zoneId, element: zone, priority, area: 1, score: priority * 100 + 1 });
            });
        }

        if (hits.length === 0) {
            return null;
        }

        hits.sort((a, b) => b.score - a.score);

        if (isLegalDrop) {
            const legal = hits.find((h) => isLegalDrop(h.zoneId));
            if (!legal) {
                return null;
            }
            return {
                zoneId: legal.zoneId,
                element: legal.element,
                priority: legal.priority,
                count: 1,
                area: legal.area
            };
        }

        return {
            zoneId: hits[0].zoneId,
            element: hits[0].element,
            priority: hits[0].priority,
            count: 1,
            area: hits[0].area
        };

    } catch (error) {
        console.error('Error in findBestDropTarget:', error);
        return null;
    }
}
export const createZones = () => {
    return [
        // 牌堆
        { id: 'talon', type: ZoneType.TALON },
        // 废牌堆
        { id: 'waste', type: ZoneType.WASTE },
        // 基础堆
        { id: 'foundation-hearts', type: ZoneType.FOUNDATION },
        { id: 'foundation-diamonds', type: ZoneType.FOUNDATION },
        { id: 'foundation-clubs', type: ZoneType.FOUNDATION },
        { id: 'foundation-spades', type: ZoneType.FOUNDATION },
        // 牌桌
        { id: 'tableau-0', type: ZoneType.TABLEAU },
        { id: 'tableau-1', type: ZoneType.TABLEAU },
        { id: 'tableau-2', type: ZoneType.TABLEAU },
        { id: 'tableau-3', type: ZoneType.TABLEAU },
        { id: 'tableau-4', type: ZoneType.TABLEAU },
        { id: 'tableau-5', type: ZoneType.TABLEAU },
        { id: 'tableau-6', type: ZoneType.TABLEAU }
    ];
}
