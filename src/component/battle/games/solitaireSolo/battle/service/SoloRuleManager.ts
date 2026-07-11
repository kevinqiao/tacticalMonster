/**
 * 单人纸牌游戏规则管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import {
    ActMode,
    Card,
    CARD_VALUES,
    GameInteractionPhase,
    SolitaireRule,
    SoloCard,
    SoloGameState,
    SoloGameStatus,
    isSolitairePlayableStatus,
    SoloHint,
    SoloMove,
    ZoneType
} from '../types/SoloTypes';
import { scoreDeltaForMove } from '@/convex/solitaireArena/convex/service/seedPool/solitaireScoring';
import { createZones } from '../Utils';

export class SoloRuleManager implements SolitaireRule {
    private gameState: SoloGameState;
    private interactionPhase: GameInteractionPhase;

    constructor(gameState: SoloGameState, interactionPhase: GameInteractionPhase) {
        this.gameState = { ...gameState, zones: createZones() };
        this.interactionPhase = interactionPhase;
    }

    getActModes(card: Card): ActMode[] {
        const modes: ActMode[] = [];

        const status = this.gameState.status as SoloGameStatus | number | undefined;
        if (this.interactionPhase !== GameInteractionPhase.idle || !isSolitairePlayableStatus(status)) {
            return modes;
        }
        if (!card.isRevealed && card.zone !== ZoneType.TALON) {
            return modes;
        }
        if (card.zone === ZoneType.TALON) {
            const zoneCards = this.gameState.cards.filter(c => c.zone === ZoneType.TALON);
            zoneCards.sort((a, b) => b.zoneIndex - a.zoneIndex);
            if (zoneCards.length > 0 && zoneCards[0].id === card.id) {
                modes.push(ActMode.CLICK);
                modes.push(ActMode.DRAG);
            }
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
     * 同一 tableau 列中是否存在叠在该牌上方的牌（更大 zoneIndex）。
     * 有跟串时只能整串在 tableau 间移动，不能单张进 foundation。
     */
    private hasTableauCardsAbove(card: Card): boolean {
        const onTableau =
            card.zone === ZoneType.TABLEAU || String(card.zoneId ?? "").startsWith("tableau-");
        if (!onTableau) return false;
        return this.gameState.cards.some(
            (c) => c.zoneId === card.zoneId && c.zoneIndex > card.zoneIndex
        );
    }

    /**
     * 检查是否可以移动卡牌到基础堆
     */
    canMoveToFoundation(card: Card, foundationZoneId: string): boolean {
        if (!card.isRevealed || !card.rank) return false;
        if (this.hasTableauCardsAbove(card)) return false;

        // 按 zoneId 认 foundation（避免 zone 字段偶发不一致导致堆顶识别失败）
        const foundationCards = this.gameState.cards
            .filter(
                (c) =>
                    c.zoneId === foundationZoneId &&
                    (c.zone === ZoneType.FOUNDATION ||
                        String(c.zoneId ?? "").startsWith("foundation-"))
            )
            .sort((a, b) => a.zoneIndex - b.zoneIndex);

        const targetSuit = foundationZoneId.split("-")[1];
        if (card.suit !== targetSuit) return false;

        if (foundationCards.length === 0) {
            return card.rank === "A";
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

        // foundation 顶牌 → tableau（Solitaire Cash 允许，-100）
        const foundationZonesForTableau = this.gameState.zones.filter(
            (zone) => zone.type === ZoneType.FOUNDATION
        );
        for (const foundationZone of foundationZonesForTableau) {
            const foundationCards = this.gameState.cards
                .filter((c) => c.zone === ZoneType.FOUNDATION && c.zoneId === foundationZone.id)
                .sort((a, b) => b.zoneIndex - a.zoneIndex);
            const topFoundation = foundationCards[0];
            if (!topFoundation) continue;

            const tableauTargets = this.gameState.zones.filter((zone) => zone.type === ZoneType.TABLEAU);
            for (const tableauZone of tableauTargets) {
                const col = parseInt(tableauZone.id.split("-")[1]);
                if (this.canMoveToTableau(topFoundation, tableauZone.id)) {
                    moves.push({
                        id: `move-${Date.now()}-${Math.random()}`,
                        type: "move",
                        from: foundationZone.id,
                        to: `tableau-${col}`,
                        card: topFoundation,
                        timestamp: Date.now(),
                        isValid: true,
                        points: -100,
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
     * 计算移动得分（Solitaire Cash base actions）
     */
    calculateMoveScore(move: SoloMove): number {
        return scoreDeltaForMove(move.from, move.to, 0);
    }
    /**
     * 检查是否可以抽牌
     */
    canDraw(cardId: string): boolean {

        const zoneCards = this.gameState.cards.filter(c => c.zone === ZoneType.TALON);
        zoneCards.sort((a, b) => b.zoneIndex - a.zoneIndex);
        if ((zoneCards.length > 0 && zoneCards[0].id !== cardId) || zoneCards.length === 0) {
            return false;
        }
        return true;
    }
    /**
       * 检查是否可以抽牌
       */
    canRecycle(): boolean {
        const talonCards = this.gameState.cards.filter(c => c.zone === ZoneType.TALON);
        if (talonCards.length > 0) return false;
        return true;
    }
    /**
     * 验证移动是否合法
     */
    canMoveToZone(card: Card, zoneId: string): boolean {
        if (!card.isRevealed || card.zoneId === zoneId || zoneId === ZoneType.TALON || zoneId === ZoneType.WASTE) return false;
        // 不依赖 zones[]：用 zoneId / zone 推断来源类型（zones 缺失时旧逻辑会直接 false）
        const sourceType =
            this.gameState.zones?.find((z) => z.id === card.zoneId)?.type ??
            (String(card.zoneId ?? "").startsWith("foundation-")
                ? ZoneType.FOUNDATION
                : String(card.zoneId ?? "").startsWith("tableau-")
                  ? ZoneType.TABLEAU
                  : card.zoneId === "waste" || card.zone === ZoneType.WASTE
                    ? ZoneType.WASTE
                    : card.zoneId === "talon" || card.zone === ZoneType.TALON
                      ? ZoneType.TALON
                      : card.zone);
        if (!sourceType) return false;

        const zoneCards = this.gameState.cards.filter((c) => c.zoneId === card.zoneId);
        zoneCards.sort((a, b) => b.zoneIndex - a.zoneIndex);
        if (
            (sourceType === ZoneType.FOUNDATION || sourceType === ZoneType.WASTE) &&
            zoneCards.length > 0 &&
            zoneCards[0].id !== card.id
        ) {
            return false;
        }

        const targetZoneType = zoneId.split("-")[0];

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
     * 以牌面为准：52 张都必须在 foundation（不依赖 zones 数组是否完整）
     */
    isGameWon(): boolean {
        const foundationCards = this.gameState.cards.filter(
            (c) =>
                c.zone === ZoneType.FOUNDATION ||
                String(c.zoneId ?? "").startsWith("foundation-")
        );
        if (foundationCards.length !== 52) {
            return false;
        }
        const suits = ["hearts", "diamonds", "clubs", "spades"] as const;
        for (const suit of suits) {
            const pile = foundationCards.filter((c) => c.zoneId === `foundation-${suit}`);
            if (pile.length !== 13) {
                return false;
            }
        }
        return true;
    }
}

export default SoloRuleManager;
