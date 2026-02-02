/**
 * Tactical Monster 移动动画
 */

import gsap from "gsap";
import { useCallback } from "react";
import { MonsterSprite } from "../../types/CombatTypes";
import { useCombatManager } from "../service/CombatManager";
import { coordToPixel } from "../utils/hexUtil";

const usePlayWalk = () => {
    const { characters, gridCells, hexCell, game, playbackSpeed = 1.0 } = useCombatManager();
    const { map } = game || {};
    const playWalk = useCallback((character: MonsterSprite, path: { q: number; r: number }[], onComplete: () => void | Promise<void>) => {

        const container = character.container;
        if (!container || !gridCells || !hexCell || !map || !characters) return;

        // 记录初始朝向
        const initialScale = character.scaleX ?? 1;
        const tl = gsap.timeline({
            timeScale: playbackSpeed,  // ✅ 应用播放速度，同步动画速度
            onStart: () => {
                character.animator?.move();
            },
            onComplete: () => {
                character.animator?.stand();
                console.log("onComplete")
                const result = onComplete();
                // 如果返回 Promise，不等待但确保错误被捕获
                if (result instanceof Promise) {
                    result.catch(err => console.error("onComplete error:", err));
                }
            }
        });

        characters.forEach((c) => {
            if (c.standEle) {
                gsap.set(c.standEle, { autoAlpha: 0 });
            }
            if (c.attackEle) {
                gsap.set(c.attackEle, { autoAlpha: 0 });
            }
        })
        const { cols, direction } = map;
        character.walkables?.forEach((node) => {
            const { q, r } = node;
            const col = direction === 1 ? cols - q - 1 : q;
            const gridCell = gridCells[r]?.[col];
            if (gridCell?.element) {
                gsap.set(gridCell.element, { opacity: 0 });
            }

        })
        character.walkables = [];
        const positions = path.map(node => {
            return coordToPixel(node.q, node.r, hexCell, map)
        });
        gsap.set(container, { x: positions[0].x, y: positions[0].y });
        // 从第二个点开始移动（跳过起始点）
        const movementPath = positions.slice(1);
        let currentScale = initialScale;
        movementPath.forEach(node => {
            const col = direction === 1 ? cols - node.q - 1 : node.q;
            const cell = gridCells[node.r]?.[col];
            if (cell?.element) {
                gsap.set(cell.element, { opacity: 0.7 });
            }
        });
        movementPath.forEach((pos, i) => {
            const prevPos = positions[i];
            const targetScale = pos.x > prevPos.x ? 1 : -1
            const isLastStep = i === movementPath.length - 1;

            const stepTl = gsap.timeline({
                onComplete: () => {
                    const col = direction === 1 ? cols - pos.q - 1 : pos.q;
                    const cell = gridCells[pos.r]?.[col];
                    if (cell?.element) {
                        gsap.set(cell.element, { opacity: 0.1 });
                    }
                }
            });

            // 处理朝向
            if (currentScale !== targetScale || isLastStep) {
                console.log("targetScale", targetScale)
                stepTl.to(container, {
                    scaleX: isLastStep ? initialScale : targetScale,
                    duration: 0.15,
                    ease: "power1.inOut",
                    overwrite: "auto"
                }, 0);
                currentScale = isLastStep ? initialScale : targetScale;
            }

            // 移动
            stepTl.to(container, {
                x: pos.x,
                y: pos.y,
                duration: 0.3,
                ease: "power1.inOut",
                overwrite: "auto"
            }, 0);

            tl.add(stepTl, i > 0 ? ">-0.1" : "+=0");
        });

        return tl.play();
    }, [characters, gridCells, hexCell, map, playbackSpeed]);

    return { playWalk }
}
export default usePlayWalk;

