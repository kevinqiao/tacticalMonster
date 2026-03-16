/**
 * 回合顺序条单项 - 展示 monsterId、血条、攻击范围
 * 从 CombatManager 与 TurnOrderBarContext 获取数据，内部计算 turn、character、isCurrent、isExiting、isReappearing
 */

import React, { useCallback } from "react";
import type { MonsterSprite } from "../../../types/CombatTypes";
import type { TurnOrderBarDimension } from "../useTurnOrderBarDimension";
import type { TurnBarItem } from "./TurnOrderBar";


export interface TurnItemSpriteProps {
    character: MonsterSprite;
    itemsMapRef: React.RefObject<Map<string, TurnBarItem>>;
    dimension: TurnOrderBarDimension | null;
}

export const TurnItemSprite: React.FC<TurnItemSpriteProps> = ({
    character, itemsMapRef, dimension
}) => {

    const loadTurnItem = useCallback((ele: HTMLDivElement | null) => {
        const key = character.character_id;
        let item = itemsMapRef.current?.get(key);
        if (!item) {
            item = { character_id: key, status: 0 };
            itemsMapRef.current?.set(key, item);
        }
        item.ele = ele ?? undefined;
    }, [character.character_id, itemsMapRef]);
    // useEffect(() => {
    //     console.log("character", character.character_id)
    // }, [character.character_id])
    return (
        <div
            ref={ele => loadTurnItem(ele)}
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
            }}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                width: "100%",
                height: "100%",
                border: "none",
            }}>
                <div>{character.monsterId ?? character.character_id}</div>
                <div>{character.attack_range?.min}-{character.attack_range?.max}</div>
            </div>

        </div >
    );
};
export const TurnItemSpriteMemo = React.memo(TurnItemSprite, (prev, next) => {
    return prev.character?.character_id === next.character?.character_id;
});
