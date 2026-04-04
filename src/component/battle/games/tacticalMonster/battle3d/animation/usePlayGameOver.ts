/**
 * 结算流程 GSAP：依赖 combatHudRegistry 中的 gameReport / matchReport 根节点。
 */
import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../../service/CombatManager";
import { getGameReportSprite, getMatchReportSprite } from "../../utils/combatHudRegistry";

export const usePlayGameOver = () => {
    const { combatHudRef } = useCombatManager();

    const playGameReport = useCallback(
        (timeline?: gsap.core.Timeline) => {
            const gameReportSprite = getGameReportSprite(combatHudRef);
            if (!gameReportSprite?.ele) return;
            const tl = timeline ?? gsap.timeline();
            tl.to(gameReportSprite.ele, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.inOut",
            });
            tl.play();
        },
        [combatHudRef]
    );

    const playGameReportClose = useCallback(
        ({
            timeline,
            onComplete,
        }: {
            timeline?: gsap.core.Timeline;
            onComplete?: () => void;
        }) => {
            const gameReportSprite = getGameReportSprite(combatHudRef);
            if (!gameReportSprite?.ele) return;
            const tl = timeline ?? gsap.timeline({ onComplete });
            tl.to(gameReportSprite.ele, {
                autoAlpha: 0,
                duration: 0.5,
                ease: "power2.inOut",
            });
            tl.play();
        },
        [combatHudRef]
    );

    const playMatchReport = useCallback(
        ({
            timeline,
            onComplete,
        }: {
            timeline?: gsap.core.Timeline;
            onComplete?: () => void;
        }) => {
            const matchReportSprite = getMatchReportSprite(combatHudRef);
            if (!matchReportSprite?.ele) return;
            const tl = timeline ?? gsap.timeline({ onComplete });
            tl.to(matchReportSprite.ele, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.inOut",
            });
            tl.play();
        },
        [combatHudRef]
    );
    const playMatchReportClose = useCallback(
        ({
            timeline,
            onComplete,
        }: {
            timeline?: gsap.core.Timeline;
            onComplete?: () => void;
        }) => {
            const matchReportSprite = getMatchReportSprite(combatHudRef);
            if (!matchReportSprite?.ele) return;
            const tl = timeline ?? gsap.timeline({ onComplete });
            tl.to(matchReportSprite.ele, {
                scale: 0.5,
                autoAlpha: 0.4,
                duration: 0.5,
                ease: "power2.inOut",
            });
            tl.play();
        },
        [combatHudRef]
    );

    return { playGameReport, playGameReportClose, playMatchReport, playMatchReportClose };
};
