/**
 * 回合顺序条单项 - 展示 monsterId、血条、攻击范围
 * 从 CombatManager 与 TurnOrderBarContext 获取数据，内部计算 turn、character、isCurrent、isExiting、isReappearing
 */

import React from "react";
import { MonsterSprite } from "../../../types/CombatTypes";
import { TurnOrderBarDimension } from "../useTurnOrderBarDimension";


export interface TurnItemSpriteProps {
    turnItem: { character: MonsterSprite, ele?: HTMLDivElement };
    dimension: TurnOrderBarDimension | null;
}

export const TurnItemSprite: React.FC<TurnItemSpriteProps> = ({
    turnItem, dimension
}) => {

    return (
        <div
            ref={ele => {
                if (ele) {
                    turnItem.ele = ele;
                }
            }}
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: dimension?.itemWidth ?? 0,
                height: dimension?.itemHeight ?? 0,
                backgroundColor: "red",
            }}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                width: "100%",
                height: "100%",
            }}>
                <div>{turnItem.character.character_id}</div>
                <div>{turnItem.character.attack_range?.min}-{turnItem.character.attack_range?.max}</div>
            </div>

        </div >
    );
};
