/**
 * 单人纸牌游戏规则管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import {
    CARD_VALUES,
    SoloCard,
    SoloFoundation,
    SoloGameState,
    SoloHint,
    SoloMove
} from '../types/SoloTypes';

export class SoloRuleManager {
    private gameState: SoloGameState;

    constructor(gameState: SoloGameState) {
        this.gameState = gameState;
    }

    /**
     * 检查是否可以移动卡牌到基础堆
     */
    canMoveToFoundation(card: SoloCard, foundation: SoloFoundation): boolean {
        if (!card.isRevealed) return false;

        // 基础堆必须按花色和顺序排列
        if (card.suit !== foundation.suit) return false;

        if (foundation.cards.length === 0) {
            // 空基础堆只能放A
            return card.rank === 'A';
        }

        const topCard = foundation.cards[foundation.cards.length - 1];
        return CARD_VALUES[card.rank] === CARD_VALUES[topCard.rank] + 1;
    }

    /**
     * 检查是否可以移动卡牌到牌桌
     */
    canMoveToTableau(card: SoloCard, targetCard: SoloCard | null, targetColumn: number): boolean {
        if (!card.isRevealed) return false;

        if (targetCard === null) {
            // 空列只能放K
            return card.rank === 'K';
        }

        if (!targetCard.isRevealed) return false;

        // 牌桌必须按颜色交替和降序排列
        const isAlternatingColor = card.isRed !== targetCard.isRed;
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

            if (!current.isRevealed || !next.isRevealed) return false;

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
        for (const foundation of this.gameState.foundations) {
            if (this.canMoveToFoundation(card, foundation)) {
                return true;
            }
        }

        // 检查是否可以移动到牌桌
        for (let col = 0; col < this.gameState.tableau.columns.length; col++) {
            const column = this.gameState.tableau.columns[col];
            const targetCard = column.length > 0 ? column[column.length - 1] : null;

            if (this.canMoveToTableau(card, targetCard, col)) {
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
        for (const foundation of this.gameState.foundations) {
            if (this.canMoveToFoundation(card, foundation)) {
                return true;
            }
        }

        // 检查是否可以移动到其他牌桌列
        for (let col = 0; col < this.gameState.tableau.columns.length; col++) {
            if (col === sourceColumn) continue;

            const column = this.gameState.tableau.columns[col];
            const targetCard = column.length > 0 ? column[column.length - 1] : null;

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
        for (const column of this.gameState.tableau.columns) {
            if (column.length > 0 && column[column.length - 1].id === card.id) {
                return !card.isRevealed;
            }
        }
        return false;
    }

    /**
     * 检查是否可以抽牌
     */
    canDrawCard(): boolean {
        return this.gameState.talon.cards.length > 0;
    }

    /**
     * 检查游戏是否胜利
     */
    isGameWon(): boolean {
        return this.gameState.foundations.every(foundation => foundation.cards.length === 13);
    }

    /**
     * 检查游戏是否失败
     */
    isGameLost(): boolean {
        // 检查是否还有可移动的卡牌
        if (this.canDrawCard()) return false;

        // 检查废牌堆是否有可移动的卡牌
        if (this.gameState.waste.length > 0) {
            const topWasteCard = this.gameState.waste[this.gameState.waste.length - 1];
            if (this.canMoveFromWaste(topWasteCard)) return false;
        }

        // 检查牌桌是否有可移动的卡牌
        for (let col = 0; col < this.gameState.tableau.columns.length; col++) {
            const column = this.gameState.tableau.columns[col];
            for (let i = column.length - 1; i >= 0; i--) {
                const card = column[i];
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
        if (this.gameState.waste.length > 0) {
            const topWasteCard = this.gameState.waste[this.gameState.waste.length - 1];

            // 移动到基础堆
            for (const foundation of this.gameState.foundations) {
                if (this.canMoveToFoundation(topWasteCard, foundation)) {
                    moves.push({
                        id: `move-${Date.now()}-${Math.random()}`,
                        type: 'foundation',
                        from: 'waste',
                        to: foundation.id,
                        card: topWasteCard,
                        timestamp: Date.now(),
                        isValid: true,
                        points: 10
                    });
                }
            }

            // 移动到牌桌
            for (let col = 0; col < this.gameState.tableau.columns.length; col++) {
                const column = this.gameState.tableau.columns[col];
                const targetCard = column.length > 0 ? column[column.length - 1] : null;

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
        for (let col = 0; col < this.gameState.tableau.columns.length; col++) {
            const column = this.gameState.tableau.columns[col];

            for (let i = column.length - 1; i >= 0; i--) {
                const card = column[i];
                if (!card.isRevealed) break;

                // 移动到基础堆
                for (const foundation of this.gameState.foundations) {
                    if (this.canMoveToFoundation(card, foundation)) {
                        moves.push({
                            id: `move-${Date.now()}-${Math.random()}`,
                            type: 'foundation',
                            from: `tableau-${col}`,
                            to: foundation.id,
                            card: card,
                            timestamp: Date.now(),
                            isValid: true,
                            points: 10
                        });
                    }
                }

                // 移动到其他牌桌列
                for (let targetCol = 0; targetCol < this.gameState.tableau.columns.length; targetCol++) {
                    if (targetCol === col) continue;

                    const targetColumn = this.gameState.tableau.columns[targetCol];
                    const targetCard = targetColumn.length > 0 ? targetColumn[targetColumn.length - 1] : null;

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
        for (let col = 0; col < this.gameState.tableau.columns.length; col++) {
            const column = this.gameState.tableau.columns[col];
            if (column.length > 0) {
                const lastCard = column[column.length - 1];
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
                const foundation = this.gameState.foundations.find(f => f.id === move.to);
                return foundation ? this.canMoveToFoundation(move.card, foundation) : false;

            case 'move':
                if (move.to.startsWith('tableau-')) {
                    const targetCol = parseInt(move.to.split('-')[1]);
                    const column = this.gameState.tableau.columns[targetCol];
                    const targetCard = column.length > 0 ? column[column.length - 1] : null;
                    return this.canMoveToTableau(move.card, targetCard, targetCol);
                }
                return false;

            default:
                return false;
        }
    }
}

export default SoloRuleManager;
