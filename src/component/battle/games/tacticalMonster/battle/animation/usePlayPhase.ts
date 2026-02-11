/**
 * Tactical Monster 阶段动画
 */

import gsap from "gsap";
import { useCallback } from "react";

import { getSkillConfig } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { MonsterSprite } from "../../types/CombatTypes";
import { GameTurn } from "../../types/gameTypes";
import { useCombatManager } from "../service/CombatManager";
import { getAttackableNodes, getWalkableNodes } from "../utils/PathFind";
import usePlaySkill from "./usePlaySkill";

const usePlayPhase = () => {
    const { groundCells, characters, mapDimension, game, playbackSpeed = 1.0 } = useCombatManager();
    const { map } = game || {};
    const { playSkill } = usePlaySkill();

    /**
     * playTurnStart - 回合开始时的逻辑处理
     * 职责：
     * 1. 触发回合开始时的被动技能动画（如每回合回血、BUFF/DEBUFF）
     * 2. 显示角色站立状态
     * 3. 返回 timeline，可以链式添加后续动画
     */
    const playTurnStart = useCallback(async (
        character: MonsterSprite,
        currentTurn: GameTurn,
        phaseChanges?: any
    ): Promise<gsap.core.Timeline> => {
        const tl = gsap.timeline({
            timeScale: playbackSpeed,
        });

        if (!character) return tl;

        // 1. ✅ 使用 phaseChanges 中的精确信息播放被动技能动画
        // 优先使用后端返回的被触发技能列表，而不是推断
        const characterId = `${character.uid}_${character.monsterId}`;

        // 从 phaseChanges 中获取被触发的被动技能列表
        // ✅ 使用 CharacterIdentifier 格式匹配（支持 bossId/minionId 来区分相同 monsterId 的小怪）
        const triggeredPassiveSkills =
            phaseChanges?.turnStart?.triggeredPassiveSkills?.filter((ps: any) => {
                // 优先使用 bossId/minionId 匹配（更准确）
                if (ps.bossId && character.character_id === ps.bossId) return true;
                if (ps.minionId && character.character_id === ps.minionId) return true;
                // 否则使用 uid 和 monsterId 匹配（向后兼容）
                return ps.uid === character.uid && ps.monsterId === character.monsterId;
            }) ||
            phaseChanges?.roundStart?.triggeredPassiveSkills?.filter((ps: any) => {
                // 优先使用 bossId/minionId 匹配（更准确）
                if (ps.bossId && character.character_id === ps.bossId) return true;
                if (ps.minionId && character.character_id === ps.minionId) return true;
                // 否则使用 uid 和 monsterId 匹配（向后兼容）
                return ps.uid === character.uid && ps.monsterId === character.monsterId;
            }) ||
            [];

        // ✅ 使用后端返回的精确信息播放动画
        if (triggeredPassiveSkills.length > 0) {
            for (const triggeredSkill of triggeredPassiveSkills) {
                const skillTimeline = playSkill(
                    character,
                    triggeredSkill.skillId,
                    [character], // 目标是自己（回合开始时的被动技能通常作用于自身）
                    () => {
                        console.log(`Passive skill (${triggeredSkill.skillId}) animation completed`);
                    }
                );
                if (skillTimeline) {
                    tl.add(skillTimeline, ">");
                }
            }
        } else {
            // ✅ 向后兼容：如果没有 phaseChanges 信息，使用推断方式（兼容旧代码）
            // 注意：这种方式可能不准确，建议后端返回完整的被动技能信息
            if (character.skills && Array.isArray(character.skills)) {
                for (const skillId of character.skills) {
                    try {
                        const skillConfig = getSkillConfig(skillId);
                        if (skillConfig?.type === 'passive' && skillConfig.triggerConditions) {
                            const hasTurnStartTrigger = skillConfig.triggerConditions.some(
                                (trigger: any) => trigger.trigger_type === 'turn_start' || trigger.trigger_type === 'round_start'
                            );
                            if (hasTurnStartTrigger) {
                                const skillTimeline = playSkill(
                                    character,
                                    skillId,
                                    [character],
                                    () => {
                                        console.log(`Turn start passive skill (${skillId}) animation completed`);
                                    }
                                );
                                if (skillTimeline) {
                                    tl.add(skillTimeline, ">");
                                }
                            }
                        }
                    } catch (error) {
                        console.warn(`Skill config not found for ${skillId}:`, error);
                    }
                }
            }
        }

        // 2. 显示角色站立状态
        if (character.standEle) {
            tl.to(character.standEle, {
                autoAlpha: 1,
                duration: 0.3,
                ease: "power2.inOut"
            }, "<");
        }

        // 如果 timeline 有内容，播放它
        // 注意：即使没有动画，也返回 timeline，调用方可以等待它完成
        if (tl.duration() > 0) {
            tl.play();
        }

        return tl;
    }, [playSkill, playbackSpeed]);

    /**
     * playTurnOn - 显示回合开始时的UI状态
     * 职责：
     * 1. 计算并显示可移动范围
     * 2. 计算并显示可攻击目标
     * 3. 高亮相关UI元素
     * 4. 等待玩家操作（不阻塞）
     */
    const playTurnOn = useCallback((currentTurn: GameTurn, onComplete: () => void) => {
        if (!characters || !groundCells || !map) {
            onComplete();
            return;
        }

        const character = characters.find((c) => c.uid === currentTurn.uid && c.monsterId === currentTurn.monsterId);
        if (!character) {
            onComplete();
            return;
        }

        // 1. 计算可移动范围
        const moveRange = character.move_range ?? 2;
        const grid = groundCells.map((row) => row.map((cell) => {
            const char = characters.find((c) => c.q === cell.q && c.r === cell.r);
            return {
                q: cell.q,
                r: cell.r,
                walkable: char ? false : !cell.disable
            };
        }));

        // 飞行单位可以忽略障碍物
        const isFlying = character.isFlying ?? false;
        const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
        const walkableNodes = getWalkableNodes(
            grid,
            { q: character.q ?? 0, r: character.r ?? 0 },
            moveRange,
            canIgnoreObstacles
        );
        character.walkables = walkableNodes;

        // 2. 计算可攻击目标
        // PVE模式：获取可攻击的目标（玩家攻击Boss，Boss攻击玩家）
        const enemies = characters.filter((c) => c.uid !== character.uid && c.character_id !== character.character_id)
            .map(c => ({
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
                attackRange: character.attack_range || { min: 1, max: 2 }
            },
            enemies,
            null
        );
        character.attackables = attackableNodes;

        // 3. 显示UI高亮
        const tl = gsap.timeline({
            timeScale: playbackSpeed,
            onComplete: () => {
                onComplete();
            }
        });

        const { cols, direction } = map;

        // 高亮可移动位置
        if (walkableNodes) {
            walkableNodes.forEach((node) => {
                const { q, r } = node;
                const col = direction === 1 ? cols - q - 1 : q;
                const gridCell = groundCells[r]?.[col];
                if (!gridCell?.element || node.distance === 0) return;
                tl.to(gridCell.element, {
                    opacity: node.distance === character.move_range ? 0.4 : 0.8,
                    duration: 0.5,
                    ease: "power2.inOut"
                }, "<");
            });
        }

        // 高亮可攻击目标
        if (character.attackables) {
            character.attackables.forEach((node) => {
                // ✅ 根据 node 中的坐标或标识符查找目标
                let enemy;
                if (node.uid && node.character_id) {
                    // 优先使用 uid 和 character_id 查找
                    enemy = characters.find(
                        (c) => c.uid === node.uid && c.character_id === node.character_id
                    );
                } else {
                    // 如果没有标识符，使用坐标查找
                    enemy = characters.find(
                        (c) => c.q === node.q && c.r === node.r
                    );
                }
                if (!enemy) return;
                if (!enemy?.attackEle) return;
                tl.to(enemy.attackEle, {
                    autoAlpha: 1,
                    duration: 0.5,
                    ease: "power2.inOut"
                }, "<");
            });
        }

        tl.play();
    }, [characters, groundCells, mapDimension, map, playbackSpeed]);

    // const playTurnInit = useCallback(() => {
    //     if (!map || !groundCells) return;
    // }, [hexCell, map]);

    return {
        playTurnStart,
        playTurnOn
    };
};
export default usePlayPhase;

