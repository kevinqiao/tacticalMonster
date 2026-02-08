/**
 * 3D 技能动画 - GSAP 时间线 + 模型 attack/hurt 动画
 */

import gsap from "gsap";
import { useCallback } from "react";
import type { MonsterSprite } from "../../types/CombatTypes";
import { useBattleCharacterRefsContext } from "../BattleCharacterRefsContext";

export const usePlaySkill3D = () => {
    const refsContext = useBattleCharacterRefsContext();

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

            casterRef.playAnimation("attack");
            targets.forEach((t) => refsContext?.getRef(t)?.playAnimation("hurt"));

            const tl = gsap.timeline({
                onComplete: () => {
                    casterRef.playAnimation("stand");
                    targets.forEach((t) => refsContext?.getRef(t)?.playAnimation("stand"));
                    const result = onComplete();
                    if (result instanceof Promise) result.catch((err) => console.error(err));
                },
            });

            tl.delay(0.5);

            return tl;
        },
        [refsContext]
    );

    return { playSkill };
};
