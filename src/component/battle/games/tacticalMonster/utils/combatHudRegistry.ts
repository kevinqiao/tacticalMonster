/**
 * Combat HUD 注册表：按 kind 存在 CombatHudByKind 各字段上（单例，无 Map key）。
 */
import type { MutableRefObject } from "react";
import type {
    CombatHudByKind,
    GameModel,
    GameReportSprite,
    TurnOrderBarSprite,
} from "../types/CombatTypes";

const getSeparatorIndexFromRound = (round: unknown): number => {
    const r = round as { turns?: { status?: number; order?: number }[] } | undefined;
    const size = r?.turns?.length ?? 0;
    const todos = r?.turns
        ?.filter((turn) => turn.status !== 2)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return todos?.length === 0 || todos?.length === size ? size : (todos?.length ?? 0);
};

/** 当前先攻条根 */
export function getTurnOrderBarSprite(
    hudRef: MutableRefObject<CombatHudByKind>
): TurnOrderBarSprite | undefined {
    return hudRef.current.turnOrder;
}

/**
 * 创建或返回单例先攻条根。
 */
export function ensureTurnOrderBarSprite(
    hudRef: MutableRefObject<CombatHudByKind>,
    game: GameModel | null | undefined
): TurnOrderBarSprite {
    const existing = hudRef.current.turnOrder;
    if (existing) {
        return existing;
    }
    const sprite: TurnOrderBarSprite = {
        ele: null,
        itemsMap: new Map(),
        separator: {
            ele: null,
            txtEle: null,
            nextRound: (game?.currentRound?.no ?? 0) + 1,
            index: getSeparatorIndexFromRound(game?.currentRound),
        },
    };
    hudRef.current.turnOrder = sprite;
    return sprite;
}

/**
 * 供 TurnOrderBar / usePlayTurnBar：视图 ref 映射到 turnOrder 字段。
 */
export function createTurnOrderBarSpriteViewRef(
    hudRef: MutableRefObject<CombatHudByKind>
): MutableRefObject<TurnOrderBarSprite | null> {
    return {
        get current(): TurnOrderBarSprite | null {
            return hudRef.current.turnOrder ?? null;
        },
        set current(value: TurnOrderBarSprite | null) {
            if (value == null) {
                delete hudRef.current.turnOrder;
            } else {
                hudRef.current.turnOrder = value;
            }
        },
    };
}

/** 当前战报/结算面板根 */
export function getGameReportSprite(
    hudRef: MutableRefObject<CombatHudByKind>
): GameReportSprite | undefined {
    return hudRef.current.gameReport;
}

/**
 * 创建或返回单例 GameReportSprite。
 */
export function ensureGameReportSprite(
    hudRef: MutableRefObject<CombatHudByKind>
): GameReportSprite {
    const existing = hudRef.current.gameReport;
    if (existing) {
        return existing;
    }
    const sprite: GameReportSprite = { ele: null };
    hudRef.current.gameReport = sprite;
    return sprite;
}

/**
 * 命令式访问战报根节点（与先攻条 view ref 同模式）。
 */
export function createGameReportSpriteViewRef(
    hudRef: MutableRefObject<CombatHudByKind>
): MutableRefObject<GameReportSprite | null> {
    return {
        get current(): GameReportSprite | null {
            return hudRef.current.gameReport ?? null;
        },
        set current(value: GameReportSprite | null) {
            if (value == null) {
                delete hudRef.current.gameReport;
            } else {
                hudRef.current.gameReport = value;
            }
        },
    };
}
