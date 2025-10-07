import { CARD_SUITS, SoloBoardDimension, SoloCard, ZoneType } from "./types/SoloTypes";

export const getCoord = (card: SoloCard, boardDimension: SoloBoardDimension) => {
    if (!boardDimension || !card.ele) return { x: 0, y: 0 };
    switch (card.zone) {
        case ZoneType.TALON: {
            const x = boardDimension.zones.talon.x
            const y = boardDimension.zones.talon.y
            return { x, y };
        }
        case ZoneType.WASTE: {
            const x = boardDimension.zones.waste.x
            const y = boardDimension.zones.waste.y
            return { x, y };
        }
        case ZoneType.TABLEAU: {
            const colIndex = +card.zoneId.split('-')[1];
            const x = boardDimension.zones.tableau.x + colIndex * (boardDimension.cardWidth + boardDimension.spacing);
            const y = boardDimension.zones.tableau.y + card.zoneIndex * (boardDimension.cardHeight * 0.3);
            return { x, y };
        }
        case ZoneType.FOUNDATION: {
            const index = CARD_SUITS.findIndex(suit => suit === card.suit);
            const x = boardDimension.zones.foundations.x + index * (boardDimension.cardWidth + boardDimension.spacing)
            const y = boardDimension.zones.foundations.y
            return { x, y };
        }
    }
}
// 获取区域优先级
const getZonePriority = (zoneId: string, card: SoloCard) => {
    if (zoneId.startsWith('foundation-')) return 100; // Foundation 最高优先级
    if (zoneId.startsWith('tableau-')) return 50;    // Tableau 中等优先级
    if (zoneId.startsWith('waste-')) return 25;      // Waste 较低优先级
    return 0;
}

// 改进的 findBestDropTarget 函数 - 基于交集面积
export const findBestDropTarget = (position: { x: number; y: number }, card: SoloCard): { zoneId: string; element: Element; priority: number; count: number; area: number } | null => {
    try {
        // 边界检查
        if (position.x < 0 || position.y < 0 || position.x > window.innerWidth || position.y > window.innerHeight) {
            return null;
        }

        // 卡牌尺寸
        const cardWidth = 60;
        const cardHeight = 84;

        // 卡牌边界
        const cardLeft = position.x - cardWidth / 2;
        const cardRight = position.x + cardWidth / 2;
        const cardTop = position.y - cardHeight / 2;
        const cardBottom = position.y + cardHeight / 2;

        // 只选择带有 data-drop-zone 属性的元素
        const dropZones = document.querySelectorAll('[data-drop-zone]');

        let bestTarget: { zoneId: string; element: Element; priority: number; count: number; area: number } | null = null;
        let bestScore = -1;

        dropZones.forEach(zone => {
            const rect = zone.getBoundingClientRect();
            const zoneId = zone.getAttribute('data-zone-id');

            if (!zoneId) return;

            // 计算交集面积
            const intersectionLeft = Math.max(cardLeft, rect.left);
            const intersectionRight = Math.min(cardRight, rect.right);
            const intersectionTop = Math.max(cardTop, rect.top);
            const intersectionBottom = Math.min(cardBottom, rect.bottom);

            // 如果没有交集，跳过
            if (intersectionLeft >= intersectionRight || intersectionTop >= intersectionBottom) {
                return;
            }

            // 计算交集面积
            const intersectionArea = (intersectionRight - intersectionLeft) * (intersectionBottom - intersectionTop);

            // 如果完全没有交集，跳过
            if (intersectionArea <= 0) {
                return;
            }

            // 获取优先级
            const priority = getZonePriority(zoneId, card);

            // 计算分数：优先级 * 100 + 交集面积
            const score = priority * 100 + intersectionArea;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = {
                    zoneId,
                    element: zone,
                    priority,
                    count: 1,
                    area: intersectionArea
                };
            }
        });

        return bestTarget;

    } catch (error) {
        console.error('Error in findBestDropTarget:', error);
        return null;
    }
}

