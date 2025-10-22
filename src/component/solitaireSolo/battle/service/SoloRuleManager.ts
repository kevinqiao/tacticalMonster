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
    SoloGameStatus,
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

        if (this.gameState.actionStatus !== ActionStatus.IDLE || this.gameState.status !== SoloGameStatus.START) {
            return modes;
        }
        if (!card.isRevealed && card.zone !== ZoneType.TALON) {
            return modes;
        }
        if (card.zone === ZoneType.TALON) {
            modes.push(ActMode.CLICK);
            return modes;
        }
        const zoneCards = this.gameState.cards.filter(c => c.zoneId === card.zoneId);
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
            zoneCards.sort((a, b) => b.zoneIndex - a.zoneIndex);
            if ((zoneCards.length > 0 && zoneCards[0].id === card.id) || zoneCards.length === 0) {
                modes.push(ActMode.CLICK);
                modes.push(ActMode.DRAG);
            }
            return modes;
        }
        return modes;
    }
    /**
     * 检查是否可以移动卡牌到基础堆
     */
    canMoveToFoundation(card: Card, foundationZoneId: string): boolean {
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
    canMoveToTableau(card: Card, zoneId: string): boolean {
        if (!card.isRevealed || !card.rank || card?.zone === ZoneType.TALON) return false;

        const zoneCards = this.gameState.cards.filter(c => c.zone === ZoneType.TABLEAU && c.zoneId === zoneId).sort((a, b) => b.zoneIndex - a.zoneIndex);
        const targetCard = zoneCards.length > 0 ? zoneCards[0] : null;
        // console.log("targetCard", targetCard, zoneCards);
        if (targetCard === null)
            return card.rank !== 'K' ? false : true

        if (!targetCard.isRevealed) return false;

        // 牌桌必须按颜色交替和降序排列
        const isAlternatingColor = card.isRed !== targetCard.isRed;
        if (!targetCard.rank) return false;
        const isDescending = CARD_VALUES[card.rank] === CARD_VALUES[targetCard.rank] - 1;

        return isAlternatingColor && isDescending;
    }



    /**
     * 检查是否可以移动卡牌到废牌堆
     */
    canMoveToWaste(card: Card): boolean {
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

            if (this.canMoveToTableau(card, tableauZone.id)) {
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

            if (this.canMoveToTableau(card, tableauZone.id)) {
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

                if (this.canMoveToTableau(topWasteCard, tableauZone.id)) {
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

                    if (this.canMoveToTableau(card, targetTableauZone.id)) {
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
        const timeBonus = Math.max(0, 100 - this.gameState.moves * 10);
        score += Math.floor(timeBonus / 10);

        return score;
    }
    /**
     * 检查是否可以抽牌
     */
    canDraw(card: Card): boolean {
        const zoneCards = this.gameState.cards.filter(c => c.zone === ZoneType.TALON);
        zoneCards.sort((a, b) => b.zoneIndex - a.zoneIndex);
        if ((zoneCards.length > 0 && zoneCards[0].id !== card.id) || zoneCards.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * 验证移动是否合法
     */
    canMoveToZone(card: Card, zoneId: string): boolean {
        if (!card.isRevealed || card.zoneId === zoneId || zoneId === ZoneType.TALON || zoneId === ZoneType.WASTE) return false;
        const zone = this.gameState.zones.find(z => z.id === card.zoneId);
        if (!zone) return false;

        const zoneCards = this.gameState.cards.filter(c => c.zoneId === card.zoneId);
        zoneCards.sort((a, b) => b.zoneIndex - a.zoneIndex);
        if ((zone.type === ZoneType.FOUNDATION || zone.type === ZoneType.WASTE) && zoneCards.length > 0 && zoneCards[0].id !== card.id) {
            return false;
        }

        const targetZoneType = zoneId.split('-')[0]

        switch (targetZoneType) {
            case ZoneType.FOUNDATION:
                return this.canMoveToFoundation(card, zoneId);
            case ZoneType.TABLEAU:
                return this.canMoveToTableau(card, zoneId);
            default:
                return false;
        }
    }

    findMoveableTargets(card: Card): { zoneId: string, zoneType: ZoneType }[] {
        const targets: { zoneId: string, zoneType: ZoneType }[] = [];

        if (card.zone === ZoneType.TALON) {
            targets.push({ zoneId: ZoneType.WASTE, zoneType: ZoneType.WASTE });
        } else {
            const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
            for (const foundationZone of foundationZones) {
                if (this.canMoveToFoundation(card, foundationZone.id)) {
                    targets.push({ zoneId: foundationZone.id, zoneType: ZoneType.FOUNDATION });
                }
            }
            const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
            for (const tableauZone of tableauZones) {
                if (this.canMoveToTableau(card, tableauZone.id)) {
                    targets.push({ zoneId: tableauZone.id, zoneType: ZoneType.TABLEAU });
                }
            }

        }
        return targets;
    }
    findTarget(card: Card): { zoneId: string, zoneType: ZoneType } | null {

        if (card.zone === ZoneType.TALON) {
            return { zoneId: ZoneType.WASTE, zoneType: ZoneType.WASTE };
        } else {
            const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
            for (const foundationZone of foundationZones) {
                if (this.canMoveToFoundation(card, foundationZone.id)) {
                    return { zoneId: foundationZone.id, zoneType: ZoneType.FOUNDATION };
                }
            }
            const tableauZones = this.gameState.zones.filter(zone => zone.type === ZoneType.TABLEAU);
            for (const tableauZone of tableauZones) {
                if (this.canMoveToTableau(card, tableauZone.id)) {
                    return { zoneId: tableauZone.id, zoneType: ZoneType.TABLEAU };
                }
            }

        }
        return null;
    }
    /**
     * 检查游戏是否胜利
     * 胜利条件：所有4个 foundation 堆都装满了13张牌（每种花色从A到K）
     */
    isGameWon(): boolean {
        const foundationZones = this.gameState.zones.filter(zone => zone.type === ZoneType.FOUNDATION);
        console.log("foundationZones", foundationZones);
        // 检查每个 foundation 堆
        for (const foundationZone of foundationZones) {
            const foundationCards = this.gameState.cards.filter(
                c => c.zone === ZoneType.FOUNDATION && c.zoneId === foundationZone.id
            );

            // 每个 foundation 堆应该有13张牌（A到K）
            if (foundationCards.length !== 13) {
                return false;
            }

            // 可选：验证顺序是否正确（A到K）
            const sortedCards = foundationCards.sort((a, b) => (a.value || 0) - (b.value || 0));
            for (let i = 0; i < sortedCards.length; i++) {
                if (sortedCards[i].value !== i + 1) {
                    return false;
                }
            }
        }

        // 所有4个 foundation 堆都满了，游戏胜利
        return true;
    }
}

export default SoloRuleManager;
