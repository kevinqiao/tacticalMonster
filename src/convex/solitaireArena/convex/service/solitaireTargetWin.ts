import type { Card } from "../types/SoloTypes";
import { ZoneType } from "../types/SoloTypes";

/** 分数是否达到挑战线（HUD / 结算用；不再触发终局） */
export function hasReachedTargetScore(score: unknown, targetScore: unknown): boolean {
    return (
        typeof targetScore === "number" &&
        Number.isFinite(targetScore) &&
        typeof score === "number" &&
        Number.isFinite(score) &&
        Math.floor(score) >= Math.floor(targetScore)
    );
}

export function hasLeftoverNonFoundationCards(cards: Card[]): boolean {
    return cards.some(
        (c) =>
            c.zone !== ZoneType.FOUNDATION &&
            !String(c.zoneId ?? "").startsWith("foundation-")
    );
}

/** 合法终局：仅清盘（挑战达标可继续玩，不视为终局） */
export function isLegitimateCompleted(game: {
    cards: Card[];
    score?: number;
    targetScore?: number;
}): boolean {
    return !hasLeftoverNonFoundationCards(game.cards);
}
