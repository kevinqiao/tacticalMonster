/**
 * 回合顺序条单项 - 展示 monsterId、血条、攻击范围
 */

import React, { useCallback } from "react";
import type { MonsterSprite, TurnOrderBarSprite } from "../../../types/CombatTypes";
import type { TurnOrderBarDimension } from "../useTurnOrderBarDimension";
import type { TurnBarItemSprite } from "./TurnOrderBar";

export interface TurnItemProps {
    character: MonsterSprite;
    turnOrderBarSpriteRef: React.MutableRefObject<TurnOrderBarSprite | null>;
    dimension: TurnOrderBarDimension | null;
}

export const TurnItem: React.FC<TurnItemProps> = ({ character, turnOrderBarSpriteRef, dimension }) => {
    const loadTurnItem = useCallback(
        (ele: HTMLDivElement | null) => {
            const root = turnOrderBarSpriteRef.current;
            if (!root) return;
            const key = character.character_id;
            let item = root.itemsMap.get(key);
            if (!item) {
                item = { character_id: key, status: 0 } as TurnBarItemSprite;
                root.itemsMap.set(key, item);
            }
            item.ele = ele ?? undefined;
        },
        [character.character_id, turnOrderBarSpriteRef]
    );

    return (
        <div
            ref={(ele) => loadTurnItem(ele)}
            key={character.character_id}
            style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                transformOrigin: "50% 100%",
                width: dimension?.itemWidth ?? 0,
                height: dimension?.itemHeight ?? 0,
                backgroundColor: "red",
                border: "none",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    width: "100%",
                    height: "100%",
                    border: "none",
                }}
            >
                <div>{character.monsterId ?? character.character_id}</div>
                <div>
                    {character.attack_range?.min}-{character.attack_range?.max}
                </div>
            </div>
        </div>
    );
};

export const TurnItemMemo = React.memo(TurnItem, (prev, next) => {
    return prev.character?.character_id === next.character?.character_id;
});
