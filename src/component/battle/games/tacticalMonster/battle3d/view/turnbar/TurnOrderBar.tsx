/**
 * 回合顺序条（先攻条）- Braveland 式全局排序展示
 * 左下角横排；展示 monsterId、血条、攻击范围；
 * 最左侧永远为当前 turn；完成时左移消失后在序列最右侧重新出现。
 * 动画由 GSAP 驱动；phase 队列消费见 BattleVenue3D 中的 usePhaseChangeEventHandler。
 */

import React, { useEffect, useMemo } from "react";
import { useCombatManager } from "../../../service/CombatManager";
import type { GameModel, TurnOrderBarSprite } from "../../../types/CombatTypes";
import { SeparatorSprite } from "./SeparatorSprite";
import { TurnItem } from "./TurnItem";
import { computeTurnBarDimension } from "./turnBarLayout";

export type { TurnBarDimension } from "./turnBarLayout";

export type TurnBarItemSprite = {
    character_id: string;
    index?: number;
    ele?: HTMLDivElement;
    status: number;
    order?: number;
    turnKey?: string;
};

const getSeparatorIndexFromRound = (round: unknown): number => {
    const r = round as { turns?: { status?: number; order?: number }[] } | undefined;
    const size = r?.turns?.length ?? 0;
    const todos = r?.turns
        ?.filter((turn) => turn.status !== 2)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return todos?.length === 0 || todos?.length === size ? size : (todos?.length ?? 0);
};

function ensureTurnOrderBarSprite(
    ref: React.MutableRefObject<TurnOrderBarSprite | null>,
    game: GameModel | null | undefined
): TurnOrderBarSprite {
    if (!ref.current) {
        ref.current = {
            ele: null,
            itemsMap: new Map(),
            separator: {
                ele: null,
                txtEle: null,
                nextRound: (game?.currentRound?.no ?? 0) + 1,
                index: getSeparatorIndexFromRound(game?.currentRound),
            },
        };
    }
    return ref.current;
}

export const TurnOrderBar: React.FC = () => {
    const { game, mapDimension, turnOrderBarSpriteRef, characters } = useCombatManager();

    const dimension = useMemo(() => computeTurnBarDimension(mapDimension), [mapDimension]);

    ensureTurnOrderBarSprite(turnOrderBarSpriteRef, game);
    const separator = turnOrderBarSpriteRef.current!.separator;

    useEffect(() => {
        const root = ensureTurnOrderBarSprite(turnOrderBarSpriteRef, game);
        root.separator.nextRound = (game?.currentRound?.no ?? 0) + 1;
        root.separator.index = getSeparatorIndexFromRound(game?.currentRound);
    }, [game?.gameId, game?.currentRound?.no, turnOrderBarSpriteRef, game]);

    const containerHeight = dimension ? dimension.itemHeight * 1.2 : 1;
    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: containerHeight,
            }}
        >
            <div
                ref={(el) => {
                    const root = turnOrderBarSpriteRef.current ?? ensureTurnOrderBarSprite(turnOrderBarSpriteRef, game);
                    root.ele = el;
                }}
                style={{
                    position: "absolute",
                    left: 0,
                    bottom: 0,
                    width: "100%",
                    height: containerHeight,
                    overflow: "visible",
                }}
            >
                {characters?.map((char) => (
                    <TurnItem
                        key={char.character_id}
                        character={char}
                        turnOrderBarSpriteRef={turnOrderBarSpriteRef}
                        dimension={dimension}
                    />
                ))}
                <SeparatorSprite dimension={dimension} separator={separator} />
            </div>
        </div>
    );
};
