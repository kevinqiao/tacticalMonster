/**
 * HP/MP 显示更新工具
 * 通过 GSAP 直接操作 DOM 更新 HP/MP 显示，避免 React 重新渲染
 */

import gsap from "gsap";
import { MonsterSprite } from "../../types/CombatTypes";

/**
 * 通过 GSAP 更新角色 HP/MP 显示（不触发 React 重新渲染）
 */
export function updateHPMPDisplay(
    character: MonsterSprite,
    hp?: number,
    mp?: number
): void {
    if (!character || !character.stats) return;

    // 更新 HP 显示
    if (hp !== undefined && character.stats.hp) {
        const hpPercentage = Math.max(0, Math.min(100, (hp / character.stats.hp.max) * 100));

        // ✅ 通过 GSAP 更新 HP 条宽度
        if (character.hpBarElement) {
            gsap.to(character.hpBarElement, {
                width: `${hpPercentage}%`,
                duration: 0.3,
                ease: "power2.out"
            });
        }

        // ✅ 通过 GSAP 更新 HP 文字
        if (character.hpTextElement) {
            gsap.to(character.hpTextElement, {
                textContent: `${hp} / ${character.stats.hp.max}`,
                duration: 0.3,
                ease: "power2.out",
                snap: { textContent: 1 }  // 整数步进
            });
        }
    }

    // 更新 MP 显示
    if (mp !== undefined && character.stats.mp) {
        const mpPercentage = Math.max(0, Math.min(100, (mp / character.stats.mp.max) * 100));

        // ✅ 通过 GSAP 更新 MP 条宽度
        if (character.mpBarElement) {
            gsap.to(character.mpBarElement, {
                width: `${mpPercentage}%`,
                duration: 0.3,
                ease: "power2.out"
            });
        }

        // ✅ 通过 GSAP 更新 MP 文字
        if (character.mpTextElement) {
            gsap.to(character.mpTextElement, {
                textContent: `${mp} / ${character.stats.mp.max}`,
                duration: 0.3,
                ease: "power2.out",
                snap: { textContent: 1 }  // 整数步进
            });
        }
    }
}
