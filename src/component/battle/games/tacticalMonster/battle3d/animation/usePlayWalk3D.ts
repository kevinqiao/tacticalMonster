/**
 * 3D 行走动画 - GSAP 驱动 position + R3F 模型动画
 * 路径节点始终为逻辑坐标 (q,r)，直接用 hexTo3DCenter 算 3D 位置。
 */

import gsap from "gsap";
import { useCallback } from "react";
import type { MonsterSprite } from "../../types/CombatTypes";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../utils/coordinate3DUtils";

interface UsePlayWalk3DOptions {
    mapDimension: BattleMapDimension | null;
    playbackSpeed?: number;
}

export const usePlayWalk3D = ({ mapDimension, playbackSpeed = 1.0 }: UsePlayWalk3DOptions) => {
    const playWalk = useCallback(
        (
            character: MonsterSprite,
            path: Array<{ q: number; r: number }>,
            onComplete: () => void | Promise<void>
        ) => {
            const ref = character.ref3D;
            if (!ref?.groupRef.current || !mapDimension || path.length === 0) {
                onComplete?.();
                return;
            }

            const group = ref.groupRef.current;
            const modelGroup = ref.modelGroupRef?.current ?? group;
            const positions = path
                .map((node) => hexTo3DCenter(node.q, node.r, mapDimension, 0))
                .filter((p): p is NonNullable<typeof p> => p !== null);

            if (positions.length === 0) {
                onComplete?.();
                return;
            }

            console.log("[HexDebug] playWalk animate", {
                isPortrait: mapDimension.isPortrait,
                pathLength: path.length,
            });

            const initialFacing = (character.scaleX ?? 1) >= 0 ? 1 : -1;
            const isPlayer = character.uid !== "boss";

            ref.playAnimation("walk");

            const movementPath = positions.slice(1);
            // 朝向常量：竖屏由相机旋转处理，模型始终用横屏朝向
            const MODEL_FACE_RIGHT = Math.PI / 2;
            const MODEL_FACE_LEFT = -Math.PI / 2;

            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    ref.playAnimation("stand");
                    character.scaleX = isPlayer ? 1 : initialFacing;
                    const result = onComplete();
                    if (result instanceof Promise) result.catch((err) => console.error("onComplete error:", err));
                },
            });

            // 每格用时，线性移动避免段末减速造成的顿挫
            const DURATION_PER_CELL = 0.22;

            // 1. 位移：整条路径用 keyframes 一次播完，ease "none" 保持匀速
            const positionKeyframes = movementPath.map((p) => ({
                x: p.x,
                z: p.z,
                duration: DURATION_PER_CELL,
                ease: "none" as const,
            }));
            if (positionKeyframes.length > 0) {
                tl.to(group.position, { keyframes: positionKeyframes }, 0);
            }

            // 2. 朝向：根据前后格子 X 坐标判断左右，与横屏一致（竖屏由相机转向）
            const rotationTargets = movementPath.map((pos, i) => {
                const prevPos = positions[i];
                return pos.x > prevPos.x ? MODEL_FACE_RIGHT : MODEL_FACE_LEFT;
            });
            if (rotationTargets.length > 0) {
                const rotationKeyframes: Array<{ y: number; duration: number; ease: string }> = [
                    { y: rotationTargets[0], duration: 0.08, ease: "power2.out" },
                ];
                for (let i = 1; i < rotationTargets.length; i++) {
                    rotationKeyframes.push({
                        y: rotationTargets[i],
                        duration: i === 1 ? DURATION_PER_CELL - 0.08 : DURATION_PER_CELL,
                        ease: "power2.out",
                    });
                }
                tl.to(
                    modelGroup.rotation,
                    {
                        keyframes: rotationKeyframes,
                        overwrite: "auto",
                    },
                    0
                );
            }

            // 玩家怪物：走完后缓动过渡转向朝右，不突变
            if (isPlayer) {
                const walkEndTime = movementPath.length * DURATION_PER_CELL;
                tl.to(
                    modelGroup.rotation,
                    { y: MODEL_FACE_RIGHT, duration: 0.4, ease: "power2.inOut" },
                    walkEndTime
                );
            }

            tl.play();
        },
        [mapDimension, playbackSpeed]
    );

    return { playWalk };
};
