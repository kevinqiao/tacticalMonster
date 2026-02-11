/**
 * 3D 技能动画 - 施法者面向目标 + 模型 attack/hurt 动画
 * 可选 mapDimension：有则攻击前旋转施法者面向目标；HP 条由 applyStateChanges 更新
 */

import gsap from "gsap";
import { useCallback } from "react";
import { logicToView } from "../../team/utils/coordinateUtils";
import type { MonsterSprite } from "../../types/CombatTypes";
import { useBattleCharacterRefsContext } from "../BattleCharacterRefsContext";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../utils/coordinate3DUtils";

const SKILL_ANIM_DURATION = 0.5;
const FACE_TARGET_DURATION = 0.2;

interface UsePlaySkill3DOptions {
    mapDimension?: BattleMapDimension | null;
    playbackSpeed?: number;
}

export const usePlaySkill3D = (options?: UsePlaySkill3DOptions) => {
    const refsContext = useBattleCharacterRefsContext();
    const mapDimension = options?.mapDimension ?? null;
    const playbackSpeed = options?.playbackSpeed ?? 1.0;

    const playSkill = useCallback(
        (
            caster: MonsterSprite,
            _skillId: string,
            targets: MonsterSprite[],
            onComplete: () => void | Promise<void>
        ): gsap.core.Timeline | null => {
            const casterRef = refsContext?.getRef(caster);
            if (!casterRef) {
                onComplete?.();
                return null;
            }

            const group = casterRef.groupRef.current;
            if (!group) {
                onComplete?.();
                return null;
            }

            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    casterRef.playAnimation("stand");
                    targets.forEach((t) => refsContext?.getRef(t)?.playAnimation("stand"));
                    const result = onComplete();
                    if (result instanceof Promise) result.catch((err) => console.error(err));
                },
            });

            // 若有 mapDimension 且存在目标，先旋转施法者面向第一个目标
            if (mapDimension && targets.length > 0) {
                const casterView = logicToView(caster.q ?? 0, caster.r ?? 0, mapDimension);
                const target = targets[0];
                const targetView = logicToView(target.q ?? 0, target.r ?? 0, mapDimension);
                const casterPos = hexTo3DCenter(casterView.q, casterView.r, mapDimension, 0);
                const targetPos = hexTo3DCenter(targetView.q, targetView.r, mapDimension, 0);
                if (casterPos && targetPos) {
                    const dx = targetPos.x - casterPos.x;
                    const dz = targetPos.z - casterPos.z;
                    const MODEL_FACE_Y = Math.PI / 2;
                    const PORTRAIT_UP_Y = Math.PI;
                    const PORTRAIT_DOWN_Y = 0;
                    let targetRotationY: number;
                    if (mapDimension.isPortrait) {
                        const faceUp = dz < 0;
                        targetRotationY = faceUp ? PORTRAIT_UP_Y : PORTRAIT_DOWN_Y;
                    } else {
                        const faceRight = dx > 0;
                        targetRotationY = faceRight ? MODEL_FACE_Y : -MODEL_FACE_Y;
                    }
                    tl.to(group.rotation, {
                        y: targetRotationY,
                        duration: FACE_TARGET_DURATION,
                        ease: "power1.inOut",
                    });
                }
            }

            casterRef.playAnimation("attack");
            targets.forEach((t) => refsContext?.getRef(t)?.playAnimation("hurt"));

            tl.delay(SKILL_ANIM_DURATION);

            return tl;
        },
        [refsContext, mapDimension, playbackSpeed]
    );

    return { playSkill };
};
