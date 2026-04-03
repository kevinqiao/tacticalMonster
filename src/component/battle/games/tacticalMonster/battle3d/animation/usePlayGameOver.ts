/**
 * 3D 行走动画 - GSAP 驱动 position + R3F 模型动画
 * 路径节点始终为逻辑坐标 (q,r)，直接用 hexTo3DCenter 算 3D 位置。
 */
import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../../service/CombatManager";
import { getGameReportSprite } from "../../utils/combatHudRegistry";


export const usePlayGameOver = () => {
    const { combatHudRef } = useCombatManager();
    const playGameReport = useCallback((timeline: gsap.core.Timeline) => {
        const gameReportSprite = getGameReportSprite(combatHudRef);
        if (!gameReportSprite) return;
        const tl = timeline ?? gsap.timeline();
        tl.to(gameReportSprite.ele, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut"
        });
        tl.play();
    }, []);

    return { playGameReport };
};
