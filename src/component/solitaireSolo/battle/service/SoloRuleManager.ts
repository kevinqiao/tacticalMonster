/**
 * 单人纸牌游戏规则管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import {
    ActionStatus,
    ActMode,
    Card,
    CARD_VALUES,
    SolitaireRule,
    SoloCard,
    SoloGameState,
    SoloHint,
    SoloMove,
    ZoneType
} from '../types/SoloTypes';

export class SoloRuleManager implements SolitaireRule {
    private gameState: SoloGameState;

    constructor(gameState: SoloGameState) {
        this.gameState = gameState;
    }
    getActModes(card: Card): ActMode[] {
        const modes: ActMode[] = [];

        if (this.gameState.actionStatus !== ActionStatus.IDLE) {
            return modes;
        }
        if (!card.isRevealed && card.zone !== ZoneType.TALON) {
            return modes;
        }
        if (card.zone === ZoneType.TALON) {
            modes.push(ActMode.CLICK);
            return modes;
        }
        if (card.zone === ZoneType.FOUNDATION) {
            // modes.push(ActMode.CLICK);
            modes.push(ActMode.DRAG);
            return modes;
        }

        if (card.zone === ZoneType.TABLEAU) {
            modes.push(ActMode.DRAG);
            modes.push(ActMode.CLICK);
            return modes;
        }
        if (card.zone === ZoneType.WASTE) {
            modes.push(ActMode.CLICK);
            modes.push(ActMode.DRAG);
            return modes;
        }
        return modes;
    }
    /**
     * 检查是否可以移动卡牌到基础堆
     */
    canMoveToFoundation(card: SoloCard, foundationZoneId: string): boolean {
        if (!card.isRevealed || !card.rank) return false;

        // 获取基础堆中的卡牌（按zoneId过滤）
        const foundationCards = this.gameState.cards
            .filter(c => c.zone === ZoneType.FOUNDATION && c.zoneId === foundationZoneId)
            .sort((a, b) => a.zoneIndex - b.zoneIndex);

        // 基础堆必须按花色和顺序排列
        const targetSuit = foundationZoneId.split('-')[1]; // 从 "foundation-hearts" 提取花色
        if (card.suit !== targetSuit) return false;

        if (foundationCards.length === 0) {
            // 空基础堆只能放A
            return card.rank === 'A';
        }

        const topCard = foundationCards[foundationCards.length - 1];
        if (!topCard.rank) return false;
        return CARD_VALUES[card.rank] === CARD_VALUES[topCard.rank] + 1;
    }

    /**
     * 检查是否可以移动卡牌到牌桌
     */
    canMoveToTableau(card: SoloCard, targetCard: SoloCard | null, targetColumn: number): boolean {
        if (!card.isRevealed || !card.rank) return false;

        if (targetCard === null) {
            // 空列只能放K
            return card.rank === 'K';
        }

        if (!targetCard.isRevealed) return false;

        // 牌桌必须按颜色交替和降序排列
        const isAlternatingColor = card.isRed !== targetCard.isRed;
        if (!targetCard.rank) return false;
        const isDescending = CARD_VALUES[card.rank] === CARD_VALUES[targetCard.rank] - 1;

        return isAlternatingColor && isDescending;
    }

    /**
     * 检查是否可以移动卡牌组到牌桌
     */
    canMoveCardSequence(cards: SoloCard[], targetCard: SoloCard | null, targetColumn: number): boolean {
        if (cards.length === 0) return false;

        // 检查卡牌序列是否有效（按降序和交替颜色排列）
        for (let i = 0; i < cards.length - 1; i++) {
            const current = cards[i];
            const next = cards[i + 1];

            if (!current.isRevealed || !next.isRevealed || !current.rank || !next.rank) return false;

            const isAlternatingColor = current.isRed !== next.isRed;
            const isDescending = CARD_VALUES[current.rank] === CARD_VALUES[next.rank] - 1;

            if (!isAlternatingColor || !isDescending) return false;
        }

        // 检查是否可以移动到目标位置
        return this.canMoveToTableau(cards[0], targetCard, targetColumn);
    }

    /**
     * 检查是否可以移动卡牌到废牌堆
     */
    canMoveToWaste(card: SoloCard): boolean {
        // 废牌堆通常不能直接移动卡牌到其中
        // 只有从牌堆抽牌才能添加到废牌堆
        return false;
    }

    /**
     * 检查是否可以从废牌堆移动卡牌
     */
    canMoveFromWaste(card: SoloCard): boolean {
        if (!card.isRevealed) return false;

        // 检查是否可以移动到基础堆
        const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
        for (const foundationZone of foundationZones) {
            if (this.canMoveToFoundation(card, foundationZone.id)) {
                return true;
            }
        }

        // 检查是否可以移动到牌桌
        const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
        for (const tableauZone of tableauZones) {
            const zoneCards = this.gameState.cards
                .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === tableauZone.id)
                .sort((a, b) => b.zoneIndex - a.zoneIndex);
            const targetCard = zoneCards.length > 0 ? zoneCards[0] : null;

            if (this.canMoveToTableau(card, targetCard, parseInt(tableauZone.id.split('-')[1]))) {
                return true;
            }
        }

        return false;
    }

    /**
     * 检查是否可以从牌桌移动卡牌
     */
    canMoveFromTableau(card: SoloCard, sourceColumn: number): boolean {
        if (!card.isRevealed) return false;

        // 检查是否可以移动到基础堆
        const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
        for (const foundationZone of foundationZones) {
            if (this.canMoveToFoundation(card, foundationZone.id)) {
                return true;
            }
        }

        // 检查是否可以移动到其他牌桌列
        const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
        for (const tableauZone of tableauZones) {
            const col = parseInt(tableauZone.id.split('-')[1]);
            if (col === sourceColumn) continue;

            const zoneCards = this.gameState.cards
                .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === tableauZone.id)
                .sort((a, b) => b.zoneIndex - a.zoneIndex);
            const targetCard = zoneCards.length > 0 ? zoneCards[0] : null;

            if (this.canMoveToTableau(card, targetCard, col)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 检查是否可以翻牌
     */
    canFlipCard(card: SoloCard): boolean {
        // 只有牌桌中每列的最后一张牌可以翻开
        const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
        for (const tableauZone of tableauZones) {
            const zoneCards = this.gameState.cards
                .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === tableauZone.id)
                .sort((a, b) => b.zoneIndex - a.zoneIndex);
            if (zoneCards.length > 0 && zoneCards[0].id === card.id) {
                return !card.isRevealed;
            }
        }
        return false;
    }

    /**
     * 检查是否可以抽牌
     */
    canDrawCard(): boolean {
        const talonCards = this.gameState.cards.filter(c => c.zone === ZoneType.TALON);
        return talonCards.length > 0;
    }

    /**
     * 检查游戏是否胜利
     */
    isGameWon(): boolean {
        const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
        return foundationZones.every(foundationZone => {
            const foundationCards = this.gameState.cards.filter(c => c.zone === ZoneType.FOUNDATION && c.zoneId === foundationZone.id);
            return foundationCards.length === 13;
        });
    }

    /**
     * 检查游戏是否失败
     */
    isGameLost(): boolean {
        // 检查是否还有可移动的卡牌
        if (this.canDrawCard()) return false;

        // 检查废牌堆是否有可移动的卡牌
        const wasteCards = this.gameState.cards.filter(c => c.zone === ZoneType.WASTE);
        if (wasteCards.length > 0) {
            const topWasteCard = wasteCards.sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
            if (this.canMoveFromWaste(topWasteCard)) return false;
        }

        // 检查牌桌是否有可移动的卡牌
        const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
        for (const tableauZone of tableauZones) {
            const col = parseInt(tableauZone.id.split('-')[1]);
            const zoneCards = this.gameState.cards
                .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === tableauZone.id)
                .sort((a, b) => b.zoneIndex - a.zoneIndex);

            for (const card of zoneCards) {
                if (card.isRevealed && this.canMoveFromTableau(card, col)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 获取所有可能的移动
     */
    getAllPossibleMoves(): SoloMove[] {
        const moves: SoloMove[] = [];

        // 检查废牌堆的移动
        const wasteCards = this.gameState.cards.filter(c => c.zone === ZoneType.WASTE);
        if (wasteCards.length > 0) {
            const topWasteCard = wasteCards.sort((a, b) => b.zoneIndex - a.zoneIndex)[0];

            // 移动到基础堆
            const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
            for (const foundationZone of foundationZones) {
                if (this.canMoveToFoundation(topWasteCard, foundationZone.id)) {
                    moves.push({
                        id: `move-${Date.now()}-${Math.random()}`,
                        type: 'foundation',
                        from: 'waste',
                        to: foundationZone.id,
                        card: topWasteCard,
                        timestamp: Date.now(),
                        isValid: true,
                        points: 10
                    });
                }
            }

            // 移动到牌桌
            const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
            for (const tableauZone of tableauZones) {
                const col = parseInt(tableauZone.id.split('-')[1]);
                const zoneCards = this.gameState.cards
                    .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === tableauZone.id)
                    .sort((a, b) => b.zoneIndex - a.zoneIndex);
                const targetCard = zoneCards.length > 0 ? zoneCards[0] : null;

                if (this.canMoveToTableau(topWasteCard, targetCard, col)) {
                    moves.push({
                        id: `move-${Date.now()}-${Math.random()}`,
                        type: 'move',
                        from: 'waste',
                        to: `tableau-${col}`,
                        card: topWasteCard,
                        timestamp: Date.now(),
                        isValid: true,
                        points: 5
                    });
                }
            }
        }

        // 检查牌桌的移动
        const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
        for (const tableauZone of tableauZones) {
            const col = parseInt(tableauZone.id.split('-')[1]);
            const zoneCards = this.gameState.cards
                .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === tableauZone.id)
                .sort((a, b) => b.zoneIndex - a.zoneIndex);

            for (let i = zoneCards.length - 1; i >= 0; i--) {
                const card = zoneCards[i];
                if (!card.isRevealed) break;

                // 移动到基础堆
                const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
                for (const foundationZone of foundationZones) {
                    if (this.canMoveToFoundation(card, foundationZone.id)) {
                        moves.push({
                            id: `move-${Date.now()}-${Math.random()}`,
                            type: 'foundation',
                            from: `tableau-${col}`,
                            to: foundationZone.id,
                            card: card,
                            timestamp: Date.now(),
                            isValid: true,
                            points: 10
                        });
                    }
                }

                // 移动到其他牌桌列
                for (const targetTableauZone of tableauZones) {
                    const targetCol = parseInt(targetTableauZone.id.split('-')[1]);
                    if (targetCol === col) continue;

                    const targetZoneCards = this.gameState.cards
                        .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === targetTableauZone.id)
                        .sort((a, b) => b.zoneIndex - a.zoneIndex);
                    const targetCard = targetZoneCards.length > 0 ? targetZoneCards[0] : null;

                    if (this.canMoveToTableau(card, targetCard, targetCol)) {
                        moves.push({
                            id: `move-${Date.now()}-${Math.random()}`,
                            type: 'move',
                            from: `tableau-${col}`,
                            to: `tableau-${targetCol}`,
                            card: card,
                            timestamp: Date.now(),
                            isValid: true,
                            points: 5
                        });
                    }
                }
            }
        }

        return moves;
    }

    /**
     * 获取游戏提示
     */
    getHints(): SoloHint[] {
        const hints: SoloHint[] = [];
        const moves = this.getAllPossibleMoves();

        // 优先提示移动到基础堆的移动
        const foundationMoves = moves.filter(move => move.type === 'foundation');
        foundationMoves.forEach(move => {
            hints.push({
                card: move.card,
                from: move.from,
                to: move.to,
                reason: 'Move to foundation for higher score',
                priority: 5
            });
        });

        // 提示其他移动
        const otherMoves = moves.filter(move => move.type !== 'foundation');
        otherMoves.forEach(move => {
            hints.push({
                card: move.card,
                from: move.from,
                to: move.to,
                reason: 'Valid move available',
                priority: 3
            });
        });

        // 提示翻牌
        const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
        for (const tableauZone of tableauZones) {
            const col = parseInt(tableauZone.id.split('-')[1]);
            const zoneCards = this.gameState.cards
                .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === tableauZone.id)
                .sort((a, b) => b.zoneIndex - a.zoneIndex);
            if (zoneCards.length > 0) {
                const lastCard = zoneCards[0];
                if (!lastCard.isRevealed) {
                    hints.push({
                        card: lastCard,
                        from: `tableau-${col}`,
                        to: `tableau-${col}`,
                        reason: 'Flip this card to reveal more options',
                        priority: 2
                    });
                }
            }
        }

        return hints.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 计算移动得分
     */
    calculateMoveScore(move: SoloMove): number {
        let score = 0;

        switch (move.type) {
            case 'foundation':
                score = 10;
                break;
            case 'move':
                score = 5;
                break;
            case 'waste':
                score = 0;
                break;
            default:
                score = 0;
        }

        // 时间奖励
        const timeBonus = Math.max(0, 100 - this.gameState.timeElapsed);
        score += Math.floor(timeBonus / 10);

        return score;
    }

    /**
     * 验证移动是否合法
     */
    validateMove(move: SoloMove): boolean {
        switch (move.type) {
            case 'foundation':
                return this.canMoveToFoundation(move.card, move.to);

            case 'move':
                if (move.to.startsWith('tableau-')) {
                    const targetCol = parseInt(move.to.split('-')[1]);
                    const targetZoneCards = this.gameState.cards
                        .filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === `tableau-${targetCol}`)
                        .sort((a, b) => b.zoneIndex - a.zoneIndex);
                    const targetCard = targetZoneCards.length > 0 ? targetZoneCards[0] : null;
                    return this.canMoveToTableau(move.card, targetCard, targetCol);
                }
                return false;

            default:
                return false;
        }
    }
}

export default SoloRuleManager;
