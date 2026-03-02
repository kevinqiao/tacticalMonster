/**
 * 3D 行走动画 - GSAP 驱动 position + R3F 模型动画
 * 路径节点始终为逻辑坐标 (q,r)，直接用 hexTo3DCenter 算 3D 位置。
 */

import { useCallback } from "react";
import { TurnBarDimension } from "../view/turnbar/TurnOrderBar";

interface UsePlayTurnBarOptions {
    dimension: TurnBarDimension;
    playbackSpeed?: number;
}

export const usePlayTurnBar = ({ dimension, playbackSpeed = 1.0 }: UsePlayTurnBarOptions) => {
    const playStartTurn = useCallback(
        (
            onComplete: () => void | Promise<void>
        ) => {


        }, [dimension, playbackSpeed]
    );
    const playEndTurn = useCallback(
        (
            onComplete: () => void | Promise<void>
        ) => {

        }, [dimension, playbackSpeed]
    );

    return { playStartTurn, playEndTurn };
};
