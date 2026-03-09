/**
 * 3D 阶段动画 - 回合开始/结束 + 格子高亮
 * 与 2D usePlayPhase 签名一致：playTurnStart(character, currentTurn, phaseChanges)、playTurnOn(currentTurn, onComplete)
 */

import gsap from "gsap";
import { useCallback } from "react";
import { getSkillConfig } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { useCombatManager } from "../../service/CombatManager";
import type { MonsterSprite } from "../../types/CombatTypes";
import type { GameTurn } from "../../types/gameTypes";
import { getAttackableNodes, getWalkableNodes } from "../../utils/PathFind";
import { showDamageNumber } from "../../utils/damageNumberDisplay";
import type { UseBattleGridStateReturn } from "../handler/useBattleGridState";
import { usePlaySkill3D } from "./usePlaySkill3D";

export const usePlayPhase3D = (gridState: UseBattleGridStateReturn | null) => {
    const { groundCells, characters, game, mapDimension, playbackSpeed = 1.0 } = useCombatManager();
    const { map } = game || {};
    const { playSkill } = usePlaySkill3D();

    /**
     * 回合开始：被动技能动画（3D 模型），与 2D 签名一致
     */
    const playTurnStart = useCallback(
        async (
            character: MonsterSprite,
            currentTurn: GameTurn,
            phaseChanges?: any
        ): Promise<gsap.core.Timeline> => {
            const tl = gsap.timeline({ timeScale: playbackSpeed });
            if (!character) return tl;

            // 状态效果 tick 动画：DOT 伤害数字（红）、HOT 治疗数字（绿）
            const statusEffectChanges = phaseChanges?.turnStart?.statusEffectChanges;
            const ticked = statusEffectChanges?.ticked as Array<{ effectId: string; type: string; value: number }> | undefined;
            if (ticked?.length) {
                for (let i = 0; i < ticked.length; i++) {
                    const item = ticked[i];
                    const isHeal = item.type === "hot";
                    tl.add(
                        gsap.delayedCall(i * 0.15, () => {
                            showDamageNumber(
                                character,
                                isHeal ? -item.value : item.value,
                                isHeal ? "heal" : "physical"
                            );
                        }),
                        i === 0 ? 0 : ">"
                    );
                }
                tl.add(gsap.delayedCall(ticked.length * 0.15, () => { }), ">");
            }

            const triggeredPassiveSkills =
                phaseChanges?.turnStart?.triggeredPassiveSkills?.filter((ps: any) => ps.character_id === character.character_id) ||
                phaseChanges?.roundStart?.triggeredPassiveSkills?.filter((ps: any) => ps.character_id === character.character_id) ||
                [];

            if (triggeredPassiveSkills.length > 0) {
                for (const triggeredSkill of triggeredPassiveSkills) {
                    const skillTimeline = playSkill(
                        character,
                        triggeredSkill.skillId,
                        [character],
                        () => { }
                    );
                    if (skillTimeline) tl.add(skillTimeline, ">");
                }
            } else if (character.skills && Array.isArray(character.skills)) {
                for (const skillId of character.skills) {
                    try {
                        const skillConfig = getSkillConfig(skillId);
                        if (skillConfig?.type === "passive" && skillConfig.triggerConditions) {
                            const hasTurnStartTrigger = skillConfig.triggerConditions.some(
                                (trigger: any) =>
                                    trigger.trigger_type === "turn_start" ||
                                    trigger.trigger_type === "round_start"
                            );
                            if (hasTurnStartTrigger) {
                                const skillTimeline = playSkill(
                                    character,
                                    skillId,
                                    [character],
                                    () => { }
                                );
                                if (skillTimeline) tl.add(skillTimeline, ">");
                            }
                        }
                    } catch {
                        // ignore missing config
                    }
                }
            }

            if (tl.duration() > 0) tl.play();
            return tl;
        },
        [playSkill, playbackSpeed]
    );

    /**
     * 显示回合 UI：内部计算可移动/可攻击格子并高亮 3D 网格，与 2D playTurnOn(currentTurn, onComplete) 一致
     * @param charactersOverride 可选，覆盖从 context 读取的 characters（用于召唤单位 turnStart 时，确保能找到新加入的角色）
     */
    const playTurnOn = useCallback(
        (currentTurn: GameTurn, onComplete: () => void, options?: { charactersOverride?: MonsterSprite[] }) => {
            const chars = options?.charactersOverride ?? characters;
            if (!chars || !groundCells || !map || !gridState) {
                onComplete();
                return;
            }

            const character = chars.find(
                (c) => c.character_id === currentTurn.character_id
            );
            if (!character) {
                onComplete();
                return;
            }

            const moveRange = character.move_range ?? 2;
            const stepsUsed = currentTurn.stepsUsed ?? 0;
            const remainingSteps = Math.max(0, moveRange - stepsUsed);
            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
            const startLogic = { q: character.q ?? 0, r: character.r ?? 0 };

            // 横竖屏统一用逻辑空间：高亮 = 可点击 = 与后端一致；竖屏时环在屏幕上可能略不齐，但所见即所点
            const grid = groundCells.map((row) =>
                row.map((cell) => {
                    const char = chars.find((c) => c.q === cell.q && c.r === cell.r);
                    const obstacle = map?.obstacles?.find((o) => o.q === cell.q && o.r === cell.r);
                    return {
                        q: cell.q,
                        r: cell.r,
                        walkable: char || obstacle || cell.disable ? false : true,
                    };
                })
            );
            console.log("[HexDebug] playTurnOn map", map);
            // 规则：部分移动后只显示暗区（distance=1，紧靠怪物的第一层），不显示亮区
            const rangeForNodes = stepsUsed > 0 ? remainingSteps : moveRange;
            const walkableNodes = getWalkableNodes(grid, startLogic, rangeForNodes, canIgnoreObstacles);
            character.walkables =
                stepsUsed > 0
                    ? walkableNodes.filter((n) => (n.distance ?? 0) === 1)
                    : walkableNodes;
            const walkableCells = character.walkables
                .filter((n) => (n.distance ?? 0) > 0)
                .map((n) => ({ q: n.q, r: n.r, distance: n.distance ?? 0 }));

            const enemies = chars
                .filter((c) => c.uid !== character.uid && c.character_id !== character.character_id)
                .map((c) => ({
                    uid: c.uid,
                    character_id: c.character_id,
                    q: c.q ?? 0,
                    r: c.r ?? 0,
                }));

            const attackableNodes = getAttackableNodes(
                grid,
                {
                    q: character.q ?? 0,
                    r: character.r ?? 0,
                    uid: character.uid,
                    character_id: character.character_id,
                    moveRange: remainingSteps,
                    attackRange: character.attack_range || { min: 1, max: 2 },
                },
                enemies,
                null,
                canIgnoreObstacles
            );
            character.attackables = attackableNodes;

            gridState.clearAll();
            const attackableCells = attackableNodes.map((n) => ({ q: n.q, r: n.r }));
            const rangeForHighlight = stepsUsed > 0 ? 1 : moveRange;
            if (walkableCells.length > 0) gridState.highlightWalkable(walkableCells, rangeForHighlight);
            if (attackableCells.length > 0) gridState.highlightAttackable(attackableCells);

            // 调试：可移动范围按 BFS 步数（与 PathFind getWalkableNodes 一致）
            const isPortrait = mapDimension?.isPortrait ?? false;
            const stepDistances = walkableCells.map((c) => c.distance);
            const maxStepD = stepDistances.length ? Math.max(...stepDistances) : -1;
            const overRange = walkableCells.filter((c) => c.distance > moveRange);

            console.log("[HexDebug] playTurnOn highlight", {
                character: startLogic,
                moveRange,
                isPortrait,
                gridShape: groundCells ? [groundCells.length, groundCells[0]?.length ?? 0] : null,
                walkableCount: walkableCells.length,
                maxStepD,
                overRangeCount: overRange.length,
                walkableSample: walkableCells.slice(0, 5),
            });
            if (isPortrait && overRange.length > 0) {
                console.warn("[HexDebug] portrait 可行走中有超出 moveRange 的格子", {
                    moveRange,
                    overRange: overRange.slice(0, 10),
                });
            }
            if (maxStepD > moveRange) {
                console.warn("[HexDebug] 可行走最远步数 maxStepD 超出 moveRange", {
                    moveRange,
                    maxStepD,
                    isPortrait,
                });
            }

            // ✅ 高亮角色所在格子（逻辑坐标）
            gridState.setSelected({ q: character.q ?? 0, r: character.r ?? 0 });

            // 活跃角色由 CombatManager 从 currentRound 推导，无需在此设置

            onComplete();
        },
        [characters, groundCells, map, gridState]
    ); // characters in deps for default; options?.charactersOverride used at call time

    const clearTurnUI = useCallback(() => {
        gridState?.clearAll();
    }, [gridState]);

    /**
     * 从当前角色位置按剩余步数刷新可行走/可攻击高亮。
     * @param remainingSteps 剩余步数（调用方传 moveRange - stepsUsed）
     * @param onlyFurthestLayer 规则：部分移动后只显示暗区（distance=1，紧靠怪物的第一层），不显示亮区；true=只显示暗区，false=显示全范围（亮区+暗区）
     */
    const refreshWalkableFromPosition = useCallback(
        (character: MonsterSprite, remainingSteps: number, onlyFurthestLayer: boolean = true) => {
            if (!characters || !groundCells || !map || !gridState) return;
            const remainingMove = Math.max(0, remainingSteps);
            const startLogic = { q: character.q ?? 0, r: character.r ?? 0 };
            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
            const grid = groundCells.map((row) =>
                row.map((cell) => {
                    const char = characters.find((c) => c.q === cell.q && c.r === cell.r);
                    const obstacle = map?.obstacles?.find((o) => o.q === cell.q && o.r === cell.r);
                    return { q: cell.q, r: cell.r, walkable: char || obstacle || cell.disable ? false : true };
                })
            );
            // 规则：部分移动后 remainingSteps=1，只显示暗区（distance=1）
            const effectiveRange = onlyFurthestLayer && remainingMove > 0 ? 1 : remainingMove;
            const allInRange = getWalkableNodes(grid, startLogic, effectiveRange, canIgnoreObstacles);
            const layer = allInRange;
            character.walkables = layer;
            const walkableCells = layer.map((n) => ({
                q: n.q,
                r: n.r,
                distance: n.distance ?? 0,
            }));
            const enemies = characters
                .filter((c) => c.uid !== character.uid && c.character_id !== character.character_id)
                .map((c) => ({ uid: c.uid, character_id: c.character_id, q: c.q ?? 0, r: c.r ?? 0 }));
            const attackableNodes = getAttackableNodes(
                grid,
                {
                    q: character.q ?? 0,
                    r: character.r ?? 0,
                    uid: character.uid,
                    character_id: character.character_id,
                    moveRange: remainingMove,
                    attackRange: character.attack_range || { min: 1, max: 2 },
                },
                enemies,
                null,
                canIgnoreObstacles
            );
            character.attackables = attackableNodes;
            gridState.clearAll();
            const rangeForHighlight = effectiveRange;
            if (walkableCells.length > 0) gridState.highlightWalkable(walkableCells, rangeForHighlight);
            const attackableCells = attackableNodes.map((n) => ({ q: n.q, r: n.r }));
            if (attackableCells.length > 0) gridState.highlightAttackable(attackableCells);
            gridState.setSelected(startLogic);
        },
        [characters, groundCells, map, gridState]
    );

    return { playTurnStart, playTurnOn, clearTurnUI, refreshWalkableFromPosition };
};
