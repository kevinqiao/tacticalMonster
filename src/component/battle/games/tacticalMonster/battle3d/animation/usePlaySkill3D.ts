/**
 * 3D 技能动画 - 施法者面向目标 + 按技能类型选择动画
 * 可选 mapDimension：有则攻击前旋转施法者面向目标；HP 条由 applyStateChanges 更新
 */

import gsap from "gsap";
import { useCallback, useMemo } from "react";
import { getSkillConfig } from "../../config/skillConfigs";
import type { MonsterSprite } from "../../types/CombatTypes";
import type { BattleMapDimension } from "../utils/coordinate3DUtils";
import { hexTo3DCenter } from "../utils/coordinate3DUtils";
import type { BattleAnimationState } from "../view/components/BattleCharacter3D";
import { SkillAnimationSelector } from "./SkillAnimationSelector";

/** 将 SkillAnimationSelector 返回的名称映射到 BattleCharacter3D 的 BattleAnimationState */
function mapAnimationNameToState(name: string | null): BattleAnimationState {
    if (!name) return "stand";
    const lower = name.toLowerCase();
    if (lower === "hurt" || lower === "hit" || lower === "damage") return "hurt";
    return "attack"; // melee, ranged_attack, cast 等施法动画统一用 attack
}

const SKILL_ANIM_DURATION = 0.5;
const FACE_TARGET_DURATION = 0.2;
const RESTORE_FACING_DURATION = 0.2;
// 朝向常量：与 BattleCharacter3D、usePlayWalk3D 一致
const MODEL_FACE_RIGHT = Math.PI / 2;
const MODEL_FACE_LEFT = -Math.PI / 2;

interface UsePlaySkill3DOptions {
    mapDimension?: BattleMapDimension | null;
    playbackSpeed?: number;
}

export const usePlaySkill3D = (options?: UsePlaySkill3DOptions) => {
    const mapDimension = options?.mapDimension ?? null;
    const playbackSpeed = options?.playbackSpeed ?? 1.0;
    const selector = useMemo(() => new SkillAnimationSelector(), []);

    const playSkill = useCallback(
        (
            caster: MonsterSprite,
            skillId: string,
            targets: MonsterSprite[],
            onComplete: () => void | Promise<void>
        ): gsap.core.Timeline | null => {
            const casterRef = caster.ref3D;
            if (!casterRef) {
                onComplete?.();
                return null;
            }

            const group = casterRef.groupRef.current;
            if (!group) {
                onComplete?.();
                return null;
            }
            const modelGroup = casterRef.modelGroupRef?.current ?? group;

            const skill = getSkillConfig(skillId);
            const casterAnim = skill
                ? mapAnimationNameToState(selector.getCasterAnimation(skill))
                : "attack";
            const targetAnim = skill
                ? mapAnimationNameToState(selector.getTargetAnimation(skill))
                : "hurt";

            const displayName = skill?.name ?? skillId;
            casterRef.showSkillName?.(displayName);

            const isPlayer = caster.uid !== "boss";
            const defaultRotationY = isPlayer ? MODEL_FACE_RIGHT : MODEL_FACE_LEFT;

            const tl = gsap.timeline({
                timeScale: playbackSpeed,
                onComplete: () => {
                    casterRef.playAnimation("stand");
                    targets.forEach((t) => t.ref3D?.playAnimation("stand"));
                    const result = onComplete();
                    if (result instanceof Promise) result.catch((err) => console.error(err));
                },
            });

            if (mapDimension && targets.length > 0) {
                const target = targets[0];
                const casterPos = hexTo3DCenter(caster.q ?? 0, caster.r ?? 0, mapDimension, 0);
                const targetPos = hexTo3DCenter(target.q ?? 0, target.r ?? 0, mapDimension, 0);
                if (casterPos && targetPos) {
                    const dx = targetPos.x - casterPos.x;
                    const faceRight = dx > 0;
                    const targetRotationY = faceRight ? MODEL_FACE_RIGHT : MODEL_FACE_LEFT;
                    tl.to(modelGroup.rotation, {
                        y: targetRotationY,
                        duration: FACE_TARGET_DURATION,
                        ease: "power1.inOut",
                    });
                }
            }

            casterRef.playAnimation(casterAnim);
            targets.forEach((t) => t.ref3D?.playAnimation(targetAnim));

            tl.delay(SKILL_ANIM_DURATION);

            // 攻击结束后恢复到默认朝向：玩家朝右，Boss朝左
            tl.to(
                modelGroup.rotation,
                { y: defaultRotationY, duration: RESTORE_FACING_DURATION, ease: "power2.inOut" },
                `+=0.1`
            );

            return tl;
        },
        [mapDimension, playbackSpeed, selector]
    );

    return { playSkill };
};
