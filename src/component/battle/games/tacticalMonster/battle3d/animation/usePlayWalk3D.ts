/**
 * 3D 行走动画 - GSAP 驱动 position + R3F 模型动画
 * 路径节点为逻辑坐标，通过 logicToView 转换为视图坐标后计算 3D 位置
 */

import gsap from "gsap";
import { useCallback } from "react";
import { logicToView } from "../../team/utils/coordinateUtils";
import type { MonsterSprite } from "../../types/CombatTypes";
import { useBattleCharacterRefsContext } from "../BattleCharacterRefsContext";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../utils/coordinate3DUtils";

interface UsePlayWalk3DOptions {
    mapDimension: BattleMapDimension | null;
    playbackSpeed?: number;
}

export const usePlayWalk3D = ({ mapDimension, playbackSpeed = 1.0 }: UsePlayWalk3DOptions) => {
    const refsContext = useBattleCharacterRefsContext();

    const playWalk = useCallback(
        (
            character: MonsterSprite,
            path: Array<{ q: number; r: number }>,
            onComplete: () => void | Promise<void>
        ) => {
            const ref = refsContext?.getRef(character);
            if (!ref?.groupRef.current || !mapDimension || path.length === 0) {
                onComplete?.();
                return;
            }

            const group = ref.groupRef.current;
            const positions = path
                .map((node) => {
                    // 逻辑坐标 → 视图坐标（竖屏时旋转）
                    const view = logicToView(node.q, node.r, mapDimension);
                    return hexTo3DCenter(view.q, view.r, mapDimension, 0);
                })
                .filter((p): p is NonNullable<typeof p> => p !== null);

            if (positions.length === 0) {
                onComplete?.();
                return;
            }

            const initialFacing = (character.scaleX ?? 1) >= 0 ? 1 : -1;

            ref.playAnimation("walk");

            const movementPath = positions.slice(1);
            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    ref.playAnimation("stand");
                    character.scaleX = initialFacing;
                    const result = onComplete();
                    if (result instanceof Promise) result.catch((err) => console.error("onComplete error:", err));
                },
            });

            const isPortrait = mapDimension.isPortrait;

            movementPath.forEach((pos, i) => {
                const prevPos = positions[i];
                const MODEL_FACE_Y = Math.PI / 2;
                const PORTRAIT_UP_Y = Math.PI;
                const PORTRAIT_DOWN_Y = 0;

                let targetRotationY: number;
                if (isPortrait) {
                    // 竖屏：根据 Z 方向判断朝向，Z 减小 = 向上, Z 增大 = 向下
                    const moveUp = pos.z < prevPos.z;
                    targetRotationY = moveUp ? PORTRAIT_UP_Y : PORTRAIT_DOWN_Y;
                } else {
                    // 横屏：根据 X 方向判断朝向
                    const moveRight = pos.x > prevPos.x;
                    targetRotationY = moveRight ? MODEL_FACE_Y : -MODEL_FACE_Y;
                }

                tl.to(
                    group.position,
                    {
                        x: pos.x,
                        z: pos.z,
                        duration: 0.3,
                        ease: "power1.inOut",
                    },
                    i > 0 ? ">-0.1" : "+=0"
                );

                tl.to(
                    group.rotation,
                    { y: targetRotationY, duration: 0.15, ease: "power1.inOut" },
                    i > 0 ? ">-0.3" : "+=0"
                );
            });

            tl.play();
        },
        [refsContext, mapDimension, playbackSpeed]
    );

    return { playWalk };
};
