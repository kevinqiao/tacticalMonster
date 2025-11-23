/**
 * Tactical Monster 技能特效动画
 * 处理技能使用的视觉效果
 */

import gsap from "gsap";
import { useCallback } from "react";
import { GameCharacter } from "../types/CombatTypes";

/**
 * 播放技能特效
 */
export const usePlaySkillEffect = () => {
    /**
     * 播放伤害特效
     */
    const playDamageEffect = useCallback((target: GameCharacter, damage: number) => {
        const container = target.container;
        if (!container) return;

        // 创建伤害数字元素
        const damageText = document.createElement('div');
        damageText.textContent = `-${damage}`;
        damageText.style.cssText = `
            position: absolute;
            color: #ff0000;
            font-size: 24px;
            font-weight: bold;
            pointer-events: none;
            z-index: 1000;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        `;
        container.appendChild(damageText);

        // 动画：向上飘动并消失
        gsap.to(damageText, {
            y: -50,
            opacity: 0,
            duration: 1,
            ease: "power2.out",
            onComplete: () => {
                container.removeChild(damageText);
            }
        });
    }, []);

    /**
     * 播放治疗特效
     */
    const playHealEffect = useCallback((target: GameCharacter, heal: number) => {
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
            onComplete: () => {
                container.removeChild(healText);
            }
        });
    }, []);

    /**
     * 播放BUFF特效
     */
    const playBuffEffect = useCallback((target: GameCharacter) => {
        const container = target.container;
        if (!container) return;

        // 创建光效
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
            onComplete: () => {
                container.removeChild(buffGlow);
            }
        });
    }, []);

    /**
     * 播放DEBUFF特效
     */
    const playDebuffEffect = useCallback((target: GameCharacter) => {
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
            onComplete: () => {
                container.removeChild(debuffGlow);
            }
        });
    }, []);

    /**
     * 播放技能释放特效
     */
    const playSkillCastEffect = useCallback((caster: GameCharacter, skillName: string) => {
        const container = caster.container;
        if (!container) return;

        // 创建技能名称显示
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
            onComplete: () => {
                container.removeChild(skillText);
            }
        });
    }, []);

    return {
        playDamageEffect,
        playHealEffect,
        playBuffEffect,
        playDebuffEffect,
        playSkillCastEffect
    };
};

export default usePlaySkillEffect;

