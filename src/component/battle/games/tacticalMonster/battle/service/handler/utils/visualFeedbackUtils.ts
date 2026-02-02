/**
 * 视觉反馈工具函数
 */

import gsap from "gsap";
import { MonsterSprite } from "../../../../types/CombatTypes";

/**
 * 应用视觉反馈（缩放效果）
 */
export const applyVisualFeedback = (character: MonsterSprite, target?: MonsterSprite) => {
    if (character.container) {
        gsap.to(character.container, { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
    }
    if (target?.container) {
        gsap.to(target.container, { scale: 1.1, duration: 0.1, yoyo: true, repeat: 1 });
    }
};

/**
 * 清除视觉反馈
 */
export const clearVisualFeedback = (character: MonsterSprite, target?: MonsterSprite) => {
    if (character.container) gsap.set(character.container, { scale: 1 });
    if (target?.container) gsap.set(target.container, { scale: 1 });
};

