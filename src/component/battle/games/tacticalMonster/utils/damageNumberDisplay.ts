/**
 * 伤害数字显示工具
 * 使用 GSAP 创建浮动伤害数字动画，避免 React 重新渲染
 */

import gsap from "gsap";

/**
 * 显示伤害数字
 * @param target - 目标角色
 * @param damageValue - 伤害值（正数表示伤害，负数表示治疗）
 * @param damageType - 伤害类型（'physical' | 'magical' | 'heal'）
 */
export function showDamageNumber(
    target: any,
    damageValue: number,
    damageType?: 'physical' | 'magical' | 'heal'
): void {
    if (!target?.container) {
        console.warn("Cannot show damage number: target container not found");
        return;
    }

    // 创建伤害数字元素
    const damageElement = document.createElement("div");
    damageElement.textContent = damageValue > 0 ? `-${damageValue}` : `+${Math.abs(damageValue)}`;
    damageElement.style.position = "absolute";
    damageElement.style.pointerEvents = "none";
    damageElement.style.userSelect = "none";
    damageElement.style.fontSize = "24px";
    damageElement.style.fontWeight = "bold";
    damageElement.style.whiteSpace = "nowrap";
    damageElement.style.zIndex = "1000";

    // 根据伤害类型设置颜色
    if (damageType === 'magical') {
        damageElement.style.color = "#9b59b6"; // 紫色（魔法伤害）
    } else if (damageType === 'heal' || damageValue < 0) {
        damageElement.style.color = "#2ecc71"; // 绿色（治疗）
    } else {
        damageElement.style.color = "#e74c3c"; // 红色（物理伤害）
    }

    // 添加到目标容器
    target.container.appendChild(damageElement);

    // 获取目标容器的位置
    const containerRect = target.container.getBoundingClientRect();
    const startX = containerRect.width / 2;
    const startY = containerRect.height / 2;

    // 设置初始位置
    gsap.set(damageElement, {
        x: startX,
        y: startY,
        opacity: 0,
        scale: 0.5
    });

    // 创建动画
    const timeline = gsap.timeline({
        onComplete: () => {
            // 动画完成后移除元素
            if (damageElement.parentNode) {
                damageElement.parentNode.removeChild(damageElement);
            }
        }
    });

    // 向上浮动并淡出
    timeline.to(damageElement, {
        y: startY - 50,
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
    }).to(damageElement, {
        y: startY - 80,
        opacity: 0,
        scale: 1.2,
        duration: 0.5,
        ease: "power2.in"
    });
}
