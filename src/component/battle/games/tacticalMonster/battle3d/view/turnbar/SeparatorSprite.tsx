/**
 * 回合顺序条单项 - 展示 monsterId、血条、攻击范围
 * 从 CombatManager 与 TurnOrderBarContext 获取数据，内部计算 turn、character、isCurrent、isExiting、isReappearing
 */

import React from "react";
import { TurnOrderBarDimension } from "../useTurnOrderBarDimension";


export interface SeparatorProps {
    dimension: TurnOrderBarDimension | null;
    separator: { ele: HTMLDivElement | null, txtEle: HTMLDivElement | null, nextRound: number, index: number };
}

export const SeparatorSprite: React.FC<SeparatorProps> = ({
    dimension, separator
}) => {
    return (
        <div
            ref={ele => {
                if (ele) {
                    separator.ele = ele;
                }
            }}
            style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                zIndex: separator.index * 4 - 1,
                transformOrigin: "50% 100%",
                width: (dimension?.itemWidth ?? 0) * 0.75,
                height: dimension?.itemHeight ?? 0,
                backgroundColor: "blue",
                border: "none",
                opacity: 0,
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
                color: "white",
            }}>
                <div ref={txtEle => {
                    if (txtEle) {
                        separator.txtEle = txtEle;
                    }
                }}>{separator.nextRound}</div>
            </div>

        </div >
    );
};
