import { CARD_SUITS, SoloBoardDimension, SoloCard, ZoneType } from "./types/SoloTypes";

export const getCoord = (card: SoloCard, cards: SoloCard[], boardDimension: SoloBoardDimension) => {
    if (!boardDimension) return { x: 0, y: 0 };
    // const zoneCards = cards.filter(c => c.zoneId === card.zoneId)
    switch (card.zone) {
        case ZoneType.TALON: {
            const x = boardDimension.zones.talon.x
            const y = boardDimension.zones.talon.y
            return { x, y };
        }
        case ZoneType.WASTE: {
            const openCards = cards.length <= 3 ? cards : cards.slice(cards.length - 3, cards.length);
            const index = openCards.findIndex(c => c.id === card.id)
            console.log("index", index, openCards)
            const offsetY = index < 0 ? 0 : index;
            const x = boardDimension.zones.waste.x + 80
            const y = boardDimension.zones.waste.y + boardDimension.cardHeight * 0.15 * offsetY + 40
            return { x, y };
        }
        case ZoneType.TABLEAU: {
            const colIndex = +card.zoneId.split('-')[1];
            const x = boardDimension.zones.tableau.x + colIndex * (boardDimension.cardWidth + boardDimension.spacing);
            if (card.isRevealed) {
                const revealedIndex = cards.sort((a, b) => a.zoneIndex - b.zoneIndex).findIndex(c => c.isRevealed)
                const offsetY = (card.zoneIndex - revealedIndex) * (boardDimension.cardHeight * 0.3) + revealedIndex * boardDimension.cardHeight * 0.1
                const y = boardDimension.zones.tableau.y + offsetY;
                return { x, y };
            } else {
                const offsetY = card.zoneIndex * (boardDimension.cardHeight * 0.1);
                const y = boardDimension.zones.tableau.y + offsetY;
                return { x, y };
            }
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

// 改进的 findBestDropTarget 函数 - 使用动态卡牌尺寸
export const findBestDropTarget = (
    position: { x: number; y: number },
    card: SoloCard,
    boardDimension: SoloBoardDimension  // 添加 boardDimension 参数
): { zoneId: string; element: Element; priority: number; count: number; area: number } | null => {
    try {
        // 边界检查
        if (position.x < 0 || position.y < 0 || position.x > window.innerWidth || position.y > window.innerHeight) {
            return null;
        }

        // 从 boardDimension 获取实际的卡牌尺寸
        const cardWidth = boardDimension.cardWidth;
        const cardHeight = boardDimension.cardHeight;

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
