/**
 * Tactical Monster 统一技能动画播放hook
 * 统一处理所有技能（包括普通攻击）的动画播放
 */

import gsap from "gsap";
import { useCallback, useMemo } from "react";
import { MonsterSkill } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { SkillEffectType } from "../config/skillConfigs";
import { useCombatManager } from "../service/CombatManager";
import { MonsterSprite } from "../types/CombatTypes";
import { SkillAnimationSelector } from "./SkillAnimationSelector";

const usePlaySkill = () => {
    const { characters, gridCells, hexCell, map, playbackSpeed = 1.0 } = useCombatManager();
    const selector = useMemo(() => new SkillAnimationSelector(), []);

    // 技能特效播放函数（整合到 usePlaySkill 中）
    const playHealEffect = useCallback((target: MonsterSprite, heal: number) => {
        const container = target.container;
        if (!container) return;

        const healText = document.createElement('div');
        healText.textContent = `+${heal}`;
        healText.style.cssText = `
            position: absolute;
            color: #00ff00;
            font-size: 24px;
            font-weight: bold;
            pointer-events: none;
            z-index: 1000;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        `;
        container.appendChild(healText);

        gsap.to(healText, {
            y: -50,
            opacity: 0,
            duration: 1,
            ease: "power2.out",
            timeScale: playbackSpeed,  // ✅ 应用播放速度
            onComplete: () => {
                container.removeChild(healText);
            }
        });
    }, [playbackSpeed]);

    const playBuffEffect = useCallback((target: MonsterSprite) => {
        const container = target.container;
        if (!container) return;

        const buffGlow = document.createElement('div');
        buffGlow.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,215,0,0.5) 0%, transparent 70%);
            pointer-events: none;
            z-index: 999;
        `;
        container.appendChild(buffGlow);

        gsap.to(buffGlow, {
            opacity: 0,
            scale: 1.5,
            duration: 0.5,
            ease: "power2.out",
            timeScale: playbackSpeed,  // ✅ 应用播放速度
            onComplete: () => {
                container.removeChild(buffGlow);
            }
        });
    }, [playbackSpeed]);

    const playDebuffEffect = useCallback((target: MonsterSprite) => {
        const container = target.container;
        if (!container) return;

        const debuffGlow = document.createElement('div');
        debuffGlow.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(139,0,0,0.5) 0%, transparent 70%);
            pointer-events: none;
            z-index: 999;
        `;
        container.appendChild(debuffGlow);

        gsap.to(debuffGlow, {
            opacity: 0,
            scale: 1.5,
            duration: 0.5,
            ease: "power2.out",
            timeScale: playbackSpeed,  // ✅ 应用播放速度
            onComplete: () => {
                container.removeChild(debuffGlow);
            }
        });
    }, [playbackSpeed]);

    const playSkillCastEffect = useCallback((caster: MonsterSprite, skillName: string) => {
        const container = caster.container;
        if (!container) return;

        const skillText = document.createElement('div');
        skillText.textContent = skillName;
        skillText.style.cssText = `
            position: absolute;
            color: #ffffff;
            font-size: 20px;
            font-weight: bold;
            pointer-events: none;
            z-index: 1001;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            top: -30px;
        `;
        container.appendChild(skillText);

        gsap.to(skillText, {
            y: -20,
            opacity: 0,
            duration: 1,
            ease: "power2.out",
            timeScale: playbackSpeed,  // ✅ 应用播放速度
            onComplete: () => {
                container.removeChild(skillText);
            }
        });
    }, [playbackSpeed]);

    const playSkill = useCallback((
        caster: MonsterSprite,
        skillId: string,
        targets: MonsterSprite[],
        onComplete: () => void | Promise<void>
    ) => {
        if (!gridCells || !hexCell || !map || !characters) {
            Promise.resolve(onComplete()).catch(console.error);
            return;
        }

        // 获取技能配置
        const skill: MonsterSkill | undefined = caster.skills?.find(s => s.id === skillId);
        if (!skill) {
            console.warn(`Skill ${skillId} not found for character ${caster.character_id}`);
            Promise.resolve(onComplete()).catch(console.error);
            return;
        }

        // 选择动画
        const casterAnimation = selector.getCasterAnimation(skill);
        const targetAnimation = selector.getTargetAnimation(skill);

        // 包装异步回调为同步回调（GSAP 要求）
        const handleFinish: () => void = () => {
            const result = onComplete();
            if (result instanceof Promise) {
                result.catch(err => console.error("onComplete error:", err));
            }
        };

        const initialScale = caster.scaleX ?? 1;

        // 计算朝向（如果有目标）
        let targetScale = 1;
        if (targets.length > 0) {
            const firstTarget = targets[0];
            const shouldFaceRight = (firstTarget.q ?? 0) > (caster.q ?? 0);
            targetScale = shouldFaceRight ? 1 : -1;
        }

        // 创建动画序列
        const tl = gsap.timeline({
            timeScale: playbackSpeed,  // ✅ 应用播放速度，同步动画速度
            onComplete: () => {
                if (caster.container) {
                    gsap.set(caster.container, { scaleX: targetScale });

                    // 播放施法者动画
                    if (caster.skeleton) {
                        const casterTrack = caster.skeleton.state.setAnimation(0, casterAnimation, true);
                        if (casterTrack) {
                            // 同时播放目标动画（如果有）
                            if (targetAnimation && targets.length > 0) {
                                targets.forEach(target => {
                                    if (target.skeleton) {
                                        const targetTrack = target.skeleton.state.setAnimation(0, targetAnimation, false);
                                        if (targetTrack) {
                                            targetTrack.listener = {
                                                complete: () => {
                                                    target.skeleton?.state.setAnimation(0, "stand", true);
                                                }
                                            };
                                        }
                                    }
                                });
                            }

                            casterTrack.listener = {
                                complete: () => {
                                    // 施法者动画完成后，恢复站立动画
                                    caster.skeleton?.state.setAnimation(0, "stand", true);

                                    if (caster.container) {
                                        gsap.to(caster.container, {
                                            scaleX: initialScale,
                                            duration: 0.2,
                                            onComplete: handleFinish
                                        });
                                    } else {
                                        handleFinish();
                                    }
                                }
                            };
                        } else {
                            // 如果没有skeleton，直接完成
                            handleFinish();
                        }
                    } else {
                        // 如果没有skeleton，直接完成
                        handleFinish();
                    }
                } else {
                    handleFinish();
                }
            }
        });

        // 清除可行走格子和UI元素
        const { cols, direction } = map;

        // 清除施法者的可行走格子
        caster.walkables?.forEach(node => {
            const { x, y } = node;
            const col = direction === 1 ? cols - x - 1 : x;
            const gridCell = gridCells[y]?.[col];
            if (gridCell?.gridWalk) {
                tl.to(gridCell.gridWalk, { autoAlpha: 0, duration: 0.5 }, "<");
            }
        });

        // 清除施法者的standEle
        if (caster.standEle) {
            tl.to(caster.standEle, { autoAlpha: 0, duration: 0.5 }, "<");
        }

        // 清除目标的attackEle
        targets.forEach(target => {
            if (target.attackEle) {
                tl.to(target.attackEle, { autoAlpha: 0, duration: 0.5 }, "<");
            }
        });

        // 播放技能特效（根据效果类型）
        skill.effects.forEach(effect => {
            targets.forEach(target => {
                switch (effect.type) {
                    case SkillEffectType.DAMAGE:
                        // 伤害特效会在实际伤害计算后播放，这里可以播放技能名称
                        playSkillCastEffect(caster, skill.name);
                        break;
                    case SkillEffectType.HEAL:
                        playHealEffect(target, effect.value as number || 0);
                        break;
                    case SkillEffectType.BUFF:
                        playBuffEffect(target);
                        break;
                    case SkillEffectType.DEBUFF:
                        playDebuffEffect(target);
                        break;
                    default:
                        // 其他效果可以播放技能名称
                        playSkillCastEffect(caster, skill.name);
                        break;
                }
            });
        });

        // 如果没有目标，只播放技能名称
        if (targets.length === 0) {
            playSkillCastEffect(caster, skill.name);
        }

        tl.play();
    }, [characters, gridCells, hexCell, map, selector, playHealEffect, playBuffEffect, playDebuffEffect, playSkillCastEffect, playbackSpeed]);

    return { playSkill };
};

export default usePlaySkill;

