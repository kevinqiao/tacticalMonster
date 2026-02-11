/**
 * 被动技能动画处理 Hook
 * ✅ 完整 effect 方案：使用完整的 effect 信息播放动画和显示伤害数字
 */

import gsap from "gsap";
import { useCallback } from "react";
import { getSkillConfig } from "../../../../config/skillConfigs";
import { MonsterSprite } from "../../../../types/CombatTypes";
import { showDamageNumber } from "../../../utils/damageNumberDisplay";

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
            if (!passiveEffect.applied) {
                // ✅ 跳过未应用的效果
                continue;
            }

            if (passiveEffect.effect?.type === 'damage') {
                // ✅ 使用 passiveSkillId 查找技能配置，获取正确的动画ID（如果有）
                // 如果技能配置中有动画信息，使用配置的动画；否则使用默认的 "basic_attack"
                let skillId = "basic_attack";  // 默认使用基础攻击动画
                if (passiveEffect.passiveSkillId) {
                    try {
                        const skillConfig = getSkillConfig(passiveEffect.passiveSkillId);
                        // 如果技能配置中有动画信息，使用配置的动画
                        // 注意：被动技能可能没有 animation 配置，此时使用默认值
                        if (skillConfig?.animation?.name) {
                            skillId = skillConfig.animation.name;
                        }
                    } catch (error) {
                        // 如果获取技能配置失败，使用默认值
                        console.warn(`Failed to get skill config for ${passiveEffect.passiveSkillId}:`, error);
                    }
                }

                // ✅ 播放反击动画
                const counterTimeline = playSkill(
                    passiveTriggerer,
                    skillId,
                    [passiveTarget],  // 反击目标是原攻击者
                    () => {
                        // ✅ 显示伤害数字（如果 effect 中有 value）
                        if (passiveEffect.effect?.value !== undefined && passiveEffect.effect.value > 0) {
                            showDamageNumber(
                                passiveTarget,
                                passiveEffect.effect.value,
                                passiveEffect.effect.damage_type as 'physical' | 'magical' | undefined
                            );
                        }
                        console.log("Passive skill (counter-attack) animation completed");
                    }
                );
                if (counterTimeline) {
                    timeline.add(counterTimeline, ">");
                }
            } else if (passiveEffect.effect?.type === 'heal') {
                // ✅ 播放治疗动画
                const healTimeline = playSkill(
                    passiveTriggerer,
                    "heal",  // 治疗技能ID（如果有）
                    [passiveTarget],
                    () => {
                        // ✅ 显示治疗数字（如果 effect 中有 value）
                        if (passiveEffect.effect?.value !== undefined && passiveEffect.effect.value > 0) {
                            showDamageNumber(
                                passiveTarget,
                                -passiveEffect.effect.value,  // 负数表示治疗
                                'heal'
                            );
                        }
                        console.log("Passive skill (heal) animation completed");
                    }
                );
                if (healTimeline) {
                    timeline.add(healTimeline, ">");
                }
            } else if (passiveEffect.effect?.type === 'buff' || passiveEffect.effect?.type === 'debuff') {
                // ✅ 播放BUFF/DEBUFF效果动画
                console.log(`Passive skill effect: ${passiveEffect.effect.type} applied`);
                // ✅ 可以在这里添加BUFF/DEBUFF的视觉特效
                // 例如：显示BUFF/DEBUFF图标、播放粒子效果等
                if (passiveTarget.container) {
                    // 简单的视觉反馈：闪烁效果
                    gsap.to(passiveTarget.container, {
                        filter: passiveEffect.effect.type === 'buff' ? "brightness(1.3)" : "brightness(0.7)",
                        duration: 0.2,
                        yoyo: true,
                        repeat: 1
                    });
                }
            } else if (passiveEffect.effect?.type === 'shield') {
                // ✅ 播放护盾效果动画
                console.log(`Passive skill effect: shield applied`);
                if (passiveTarget.container) {
                    // 简单的视觉反馈：护盾闪烁效果
                    gsap.to(passiveTarget.container, {
                        filter: "brightness(1.2) drop-shadow(0 0 10px #3498db)",
                        duration: 0.3,
                        yoyo: true,
                        repeat: 1
                    });
                }
            }
        }
    }, [playSkill]);

    const handlePassiveSkillAnimations = useCallback((
        backendResult: any,
        activeSkillTimeline: gsap.core.Timeline | undefined,
        character: MonsterSprite | undefined,
        target: MonsterSprite | undefined
    ) => {
        if (!target || !character) return;

        // ✅ 从 phaseChanges.effects 获取 effects（顶层）
        const phaseChanges = backendResult.phaseChanges;
        const effects = phaseChanges?.effects || backendResult.effects || [];

        if (effects.length === 0) return;

        const passiveEffects = effects.filter((e: any) => e.isPassive);
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

