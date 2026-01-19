/**
 * 移动操作 Hook
 * 方案1：乐观UI + 悲观状态
 * - 立即播放移动动画（乐观UI）
 * - 等待后端响应后应用位置变化（悲观状态）
 * - 移除状态快照和回滚机制
 */

import gsap from "gsap";
import { useCallback, useRef } from "react";
import { api } from "../../../../../../../../convex/tacticalMonster/convex/_generated/api";
import { findPath } from "../../../utils/PathFind";
import { coordToPixel } from "../../../utils/hexUtil";
import { createCharacterIdentifiers } from "../utils/characterUtils";
import { clearPathHighlight, highlightPath } from "../utils/pathHighlightUtils";
import { canPerformAction } from "../utils/validationUtils";

/**
 * 移动操作
 * 方案1：乐观UI + 悲观状态
 * - 立即播放移动动画（乐观UI）
 * - 等待后端响应后应用位置变化（悲观状态）
 * - 后端失败时：回滚 DOM 位置到原始位置
 */
export const useWalkAction = (
    game: any,
    characters: any[],
    gridCells: any[][],
    mode: string,
    convex: any,
    playWalk: (character: any, path: Array<{ q: number; r: number }>, onComplete: () => void | Promise<void>) => void,
    handlePhaseChanges: (phaseChanges: any) => Promise<void>,
    hexCell?: any  // ✅ 需要 hexCell 来计算像素位置
) => {
    // ✅ 保存动画 timeline，以便后端失败时停止/回滚
    const walkTimelineRef = useRef<{ character: any; originalPos: { q: number; r: number }; timeline?: any } | null>(null);

    const walk = useCallback(async (to: { q: number; r: number }): Promise<void> => {
        const validation = canPerformAction(mode, game, characters);
        if (!validation.can || !validation.character || !gridCells || !game?.map || !hexCell) {
            return Promise.reject(new Error("Cannot perform walk action"));
        }

        const { character } = validation;

        // ✅ 保存原始位置（用于回滚）
        const originalPos = { q: character.q ?? 0, r: character.r ?? 0 };

        const col = game.map.direction === 1 ? game.map.cols - to.q - 1 : to.q;
        // 飞行单位可以忽略障碍物
        const isFlying = character.isFlying ?? false;
        const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
        const path = findPath(
            gridCells,
            { q: originalPos.q, r: originalPos.r },
            { q: col, r: to.r },
            canIgnoreObstacles
        );

        if (!path) {
            return Promise.reject(new Error("Cannot find path"));
        }

        const finalPos = path[path.length - 1];
        highlightPath(path, gridCells, { q: col, r: to.r });
        if (character.container) {
            gsap.to(character.container, { filter: "brightness(1.2)", duration: 0.2 });
        }

        const { casterIdentifier: characterIdentifier } = createCharacterIdentifiers(characters, character);

        // ✅ 发送后端请求（在动画播放前）
        const backendRequestPromise = convex.mutation((api as any).service.game.gameService.walk, {
            gameId: game.gameId,
            to: { q: col, r: to.r },
            identifier: characterIdentifier
        });

        // ✅ 返回 Promise，等待动画和后端响应都完成
        return new Promise<void>((resolve, reject) => {
            // ✅ 方案1：立即播放移动动画（乐观UI）
            playWalk(character, path, async () => {
                // ✅ 方案1：动画完成后，等待后端响应再更新位置（悲观状态）
                if (character.container) gsap.set(character.container, { filter: "none" });
                clearPathHighlight(path, gridCells, { q: col, r: to.r });

                if (!game) {
                    reject(new Error("Game not found"));
                    return;
                }

                // ✅ 处理后端响应
                try {
                    const result = await backendRequestPromise;

                    if (result.success) {
                        // ✅ 方案1：后端确认后，应用位置变化
                        // 注意：如果后端返回的 stateChanges 包含位置信息，应该使用后端数据
                        // 这里暂时使用动画的目标位置（因为 walk 动作的后端响应可能不包含 stateChanges）
                        character.q = finalPos.q;
                        character.r = finalPos.r;

                        if (result.phaseChanges) await handlePhaseChanges(result.phaseChanges);
                        
                        // ✅ 移动成功，resolve Promise
                        resolve();
                    } else {
                        // ✅ 方案1：后端拒绝，回滚 DOM 位置到原始位置
                        if (character.container) {
                            const originalPixelPos = coordToPixel(originalPos.q, originalPos.r, hexCell, game.map);
                            gsap.to(character.container, {
                                x: originalPixelPos.x,
                                y: originalPixelPos.y,
                                duration: 0.3,
                                ease: "power2.out",
                                onComplete: () => {
                                    console.warn("Walk rejected by backend, position rolled back");
                                }
                            });
                        }
                        reject(new Error("Walk rejected by backend"));
                    }
                } catch (error) {
                    console.error("Walk failed", error);
                    // ✅ 方案1：错误时回滚 DOM 位置到原始位置
                    if (character.container) {
                        const originalPixelPos = coordToPixel(originalPos.q, originalPos.r, hexCell, game.map);
                        gsap.to(character.container, {
                            x: originalPixelPos.x,
                            y: originalPixelPos.y,
                            duration: 0.3,
                            ease: "power2.out",
                            onComplete: () => {
                                console.warn("Walk failed, position rolled back");
                            }
                        });
                    }
                    reject(error);
                }

                // ✅ 清理引用
                walkTimelineRef.current = null;
            });
        });
    }, [game, characters, gridCells, mode, convex, playWalk, handlePhaseChanges, hexCell]);

    return { walk };
};

