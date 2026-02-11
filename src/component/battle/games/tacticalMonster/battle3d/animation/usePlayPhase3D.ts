/**
 * 3D 阶段动画 - 回合开始/结束 + 格子高亮
 * 与 2D usePlayPhase 签名一致：playTurnStart(character, currentTurn, phaseChanges)、playTurnOn(currentTurn, onComplete)
 */

import gsap from "gsap";
import { useCallback } from "react";
import { getSkillConfig } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { useCombatManager } from "../../battle/service/CombatManager";
import { getAttackableNodes, getWalkableNodes } from "../../battle/utils/PathFind";
import { showDamageNumber } from "../../battle/utils/damageNumberDisplay";
import type { MonsterSprite } from "../../types/CombatTypes";
import type { GameTurn } from "../../types/gameTypes";
import type { UseBattleGridStateReturn } from "../hooks/useBattleGridState";
import { getCharacterKey } from "../utils/battle3DAdapter";
import { usePlaySkill3D } from "./usePlaySkill3D";

export const usePlayPhase3D = (gridState: UseBattleGridStateReturn | null) => {
    const { groundCells, characters, game, playbackSpeed = 1.0, setActiveCharacterKey } = useCombatManager();
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

            const isFlying = character.isFlying ?? false;
            const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
            const walkableNodes = getWalkableNodes(
                grid,
                { q: character.q ?? 0, r: character.r ?? 0 },
                moveRange,
                canIgnoreObstacles
            );
            character.walkables = walkableNodes;

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
            const walkableCells = walkableNodes
                .filter((n) => n.distance !== 0)
                .map((n) => ({ q: n.q, r: n.r }));
            const attackableCells = attackableNodes.map((n) => ({ q: n.q, r: n.r }));
            if (walkableCells.length > 0) gridState.highlightWalkable(walkableCells);
            if (attackableCells.length > 0) gridState.highlightAttackable(attackableCells);

            // ✅ 高亮角色所在格子
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

    return { playTurnStart, playTurnOn, clearTurnUI };
};
