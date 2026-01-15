/**
 * 被动技能动画处理 Hook
 */

import gsap from "gsap";
import { useCallback } from "react";
import { MonsterSprite } from "../../../types/CombatTypes";

/**
 * 被动技能动画处理
 */
export const usePassiveSkillAnimations = (
    characters: MonsterSprite[] | undefined,
    playSkill: (
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[],
        onComplete: () => void | Promise<void>
    ) => gsap.core.Timeline | null
) => {
    const playPassiveSkillEffects = useCallback((
        passiveEffects: any[],
        passiveTriggerer: MonsterSprite,
        passiveTarget: MonsterSprite,
        timeline: gsap.core.Timeline
    ) => {
        for (const passiveEffect of passiveEffects) {
            if (passiveEffect.effect?.type === 'damage') {
                // 播放反击动画
                const counterTimeline = playSkill(
                    passiveTriggerer,
                    "basic_attack",  // 反击通常使用基础攻击
                    [passiveTarget],  // 反击目标是原攻击者
                    () => {
                        console.log("Passive skill (counter-attack) animation completed");
                    }
                );
                if (counterTimeline) {
                    timeline.add(counterTimeline, ">");
                }
            } else if (passiveEffect.effect?.type === 'buff' || passiveEffect.effect?.type === 'debuff') {
                // 播放BUFF/DEBUFF效果动画
                console.log(`Passive skill effect: ${passiveEffect.effect.type} applied`);
                // 可以在这里添加BUFF/DEBUFF的视觉特效
            }
        }
    }, [playSkill]);

    const handlePassiveSkillAnimations = useCallback((
        backendResult: any,
        activeSkillTimeline: gsap.core.Timeline | undefined,
        character: MonsterSprite | undefined,
        target: MonsterSprite | undefined
    ) => {
        if (!backendResult.effects || !target || !character) return;

        const passiveEffects = backendResult.effects.filter((e: any) => e.isPassive);
        if (passiveEffects.length === 0) return;

        const passiveTriggerer = characters?.find((c: MonsterSprite) =>
            c.character_id === target.character_id
        );
        const passiveTarget = characters?.find((c: MonsterSprite) =>
            c.character_id === character.character_id
        );

        if (!passiveTriggerer || !passiveTarget) return;

        if (activeSkillTimeline && (activeSkillTimeline.isActive() || activeSkillTimeline.progress() < 1)) {
            // 主动技能动画还在运行，将被动技能动画添加到同一个 timeline
            activeSkillTimeline.add(() => {
                playPassiveSkillEffects(passiveEffects, passiveTriggerer, passiveTarget, activeSkillTimeline);
            }, ">");
        } else {
            // 主动技能动画已完成，创建新的 timeline 来播放被动技能动画
            const passiveSkillTimeline = gsap.timeline({
                delay: 0,  // 立即开始（主动技能动画已完成）
                onComplete: () => {
                    console.log("All passive skill animations completed");
                }
            });
            playPassiveSkillEffects(passiveEffects, passiveTriggerer, passiveTarget, passiveSkillTimeline);
            passiveSkillTimeline.play();
        }
    }, [characters, playPassiveSkillEffects]);

    return { handlePassiveSkillAnimations };
};

