/**
 * 3D 阶段动画 - 回合开始/结束 + 格子高亮
 * 与 2D usePlayPhase 签名一致：playTurnStart(character, currentTurn, phaseChanges)、playTurnOn(currentTurn, onComplete)
 */

import gsap from "gsap";
import { useCallback } from "react";
import { getSkillConfig } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { useCombatManager } from "../../service/CombatManager";
import { getAttackableNodes, getWalkableNodes } from "../../utils/PathFind";
import { showDamageNumber } from "../../utils/damageNumberDisplay";
import type { MonsterSprite } from "../../types/CombatTypes";
import type { GameTurn } from "../../types/gameTypes";
import type { UseBattleGridStateReturn } from "../hooks/useBattleGridState";
import { getCharacterKey } from "../utils/battle3DAdapter";
import { usePlaySkill3D } from "./usePlaySkill3D";

export const usePlayPhase3D = (gridState: UseBattleGridStateReturn | null) => {
    const { groundCells, characters, game, mapDimension, playbackSpeed = 1.0, setActiveCharacterKey } = useCombatManager();
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
                phaseChanges?.turnStart?.triggeredPassiveSkills?.filter((ps: any) => {
                    if (ps.bossId && character.character_id === ps.bossId) return true;
                    if (ps.minionId && character.character_id === ps.minionId) return true;
                    return ps.uid === character.uid && ps.monsterId === character.monsterId;
                }) ||
                phaseChanges?.roundStart?.triggeredPassiveSkills?.filter((ps: any) => {
                    if (ps.bossId && character.character_id === ps.bossId) return true;
                    if (ps.minionId && character.character_id === ps.minionId) return true;
                    return ps.uid === character.uid && ps.monsterId === character.monsterId;
                }) ||
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
     */
    const playTurnOn = useCallback(
        (currentTurn: GameTurn, onComplete: () => void) => {
            if (!characters || !groundCells || !map || !gridState) {
                onComplete();
                return;
            }

            const character = characters.find(
                (c) => c.uid === currentTurn.uid && c.monsterId === currentTurn.monsterId
            );
            if (!character) {
                onComplete();
                return;
            }

            const moveRange = character.move_range ?? 2;
            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
            const startLogic = { q: character.q ?? 0, r: character.r ?? 0 };
            // offset 六边形距离，与 PathFind/网格一致，用于「近深远浅」暗区正确落在最远一层
            const offsetDist = (a: { q: number; r: number }, b: { q: number; r: number }) => {
                const dq = Math.abs(a.q - b.q);
                const dr = Math.abs(a.r - b.r);
                return Math.max(dq, dr) + Math.floor(Math.min(dq, dr) / 2);
            };

            // 横竖屏统一用逻辑空间：高亮 = 可点击 = 与后端一致；竖屏时环在屏幕上可能略不齐，但所见即所点
            const grid = groundCells.map((row) =>
                row.map((cell) => {
                    const char = characters.find((c) => c.q === cell.q && c.r === cell.r);
                    return {
                        q: cell.q,
                        r: cell.r,
                        walkable: char ? false : !cell.disable,
                    };
                })
            );
            const walkableNodes = getWalkableNodes(grid, startLogic, moveRange, canIgnoreObstacles);
            character.walkables = walkableNodes;
            const walkableCells = walkableNodes
                .filter((n) => offsetDist(startLogic, { q: n.q, r: n.r }) !== 0)
                .map((n) => ({ q: n.q, r: n.r, distance: offsetDist(startLogic, { q: n.q, r: n.r }) }));

            const enemies = characters
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
                    moveRange: character.move_range ?? 2,
                    attackRange: character.attack_range || { min: 1, max: 2 },
                },
                enemies,
                null
            );
            character.attackables = attackableNodes;

            gridState.clearAll();
            const attackableCells = attackableNodes.map((n) => ({ q: n.q, r: n.r }));
            if (walkableCells.length > 0) gridState.highlightWalkable(walkableCells, moveRange);
            if (attackableCells.length > 0) gridState.highlightAttackable(attackableCells);

            // 调试：可移动范围（用 offset 距离与 PathFind 一致）
            const isPortrait = mapDimension?.isPortrait ?? false;
            const offsetDistances = walkableCells.map((c) => offsetDist(startLogic, c));
            const maxOffsetD = offsetDistances.length ? Math.max(...offsetDistances) : -1;
            const overRange = walkableCells.filter((c) => offsetDist(startLogic, c) > moveRange);

            console.log("[HexDebug] playTurnOn highlight", {
                character: startLogic,
                moveRange,
                isPortrait,
                gridShape: groundCells ? [groundCells.length, groundCells[0]?.length ?? 0] : null,
                walkableCount: walkableCells.length,
                maxOffsetD,
                overRangeCount: overRange.length,
                walkableSample: walkableCells.slice(0, 5).map((c) => ({ ...c, offsetD: offsetDist(startLogic, c) })),
            });
            if (isPortrait && overRange.length > 0) {
                console.warn("[HexDebug] portrait 可行走中有超出 moveRange 的格子", {
                    moveRange,
                    overRange: overRange.slice(0, 10).map((c) => ({ ...c, offsetD: offsetDist(startLogic, c) })),
                });
            }
            if (maxOffsetD > moveRange) {
                console.warn("[HexDebug] 可行走最远距离 maxOffsetD 超出 moveRange", {
                    moveRange,
                    maxOffsetD,
                    isPortrait,
                });
            }

            // ✅ 高亮角色所在格子（逻辑坐标）
            gridState.setSelected({ q: character.q ?? 0, r: character.r ?? 0 });

            // ✅ 设置活跃角色（驱动 BattleCharacter3D 发光环指示器）
            const charKey = getCharacterKey(character);
            console.log("[playTurnOn] setActiveCharacterKey:", charKey, "character:", character.uid, character.monsterId);
            setActiveCharacterKey(charKey);

            onComplete();
        },
        [characters, groundCells, map, gridState, setActiveCharacterKey]
    );

    const clearTurnUI = useCallback(() => {
        gridState?.clearAll();
        setActiveCharacterKey(null);
    }, [gridState, setActiveCharacterKey]);

    /**
     * 从当前角色位置按剩余步数刷新可行走/可攻击高亮。
     * @param onlyFurthestLayer true：只显示暗区（最远一层），用于部分移动后；false：显示全范围（亮区+暗区），用于第一次点击失败等恢复
     */
    const refreshWalkableFromPosition = useCallback(
        (character: MonsterSprite, moveRange: number, onlyFurthestLayer: boolean = true) => {
            if (!characters || !groundCells || !map || !gridState) return;
            const startLogic = { q: character.q ?? 0, r: character.r ?? 0 };
            const offsetDist = (a: { q: number; r: number }, b: { q: number; r: number }) => {
                const dq = Math.abs(a.q - b.q);
                const dr = Math.abs(a.r - b.r);
                return Math.max(dq, dr) + Math.floor(Math.min(dq, dr) / 2);
            };
            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
            const grid = groundCells.map((row) =>
                row.map((cell) => {
                    const char = characters.find((c) => c.q === cell.q && c.r === cell.r);
                    return { q: cell.q, r: cell.r, walkable: char ? false : !cell.disable };
                })
            );
            const allInRange = getWalkableNodes(grid, startLogic, moveRange, canIgnoreObstacles);
            const layer =
                onlyFurthestLayer
                    ? allInRange.filter((n) => offsetDist(startLogic, { q: n.q, r: n.r }) === moveRange)
                    : allInRange;
            character.walkables = layer;
            const walkableCells = layer.map((n) => {
                const d = offsetDist(startLogic, { q: n.q, r: n.r });
                return { q: n.q, r: n.r, distance: d };
            });
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
                    moveRange: character.move_range ?? 2,
                    attackRange: character.attack_range || { min: 1, max: 2 },
                },
                enemies,
                null
            );
            character.attackables = attackableNodes;
            gridState.clearAll();
            if (walkableCells.length > 0) gridState.highlightWalkable(walkableCells, moveRange);
            const attackableCells = attackableNodes.map((n) => ({ q: n.q, r: n.r }));
            if (attackableCells.length > 0) gridState.highlightAttackable(attackableCells);
            gridState.setSelected(startLogic);
        },
        [characters, groundCells, map, gridState]
    );

    return { playTurnStart, playTurnOn, clearTurnUI, refreshWalkableFromPosition };
};
