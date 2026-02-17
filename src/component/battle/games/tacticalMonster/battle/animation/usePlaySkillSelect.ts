/**
 * Tactical Monster 技能选择动画
 */

import gsap from "gsap";
import { useCallback } from "react";
import { COMMON_SKILLS } from "../../config/skillConfigs";
import { useCombatManager } from "../../service/CombatManager";
import { MonsterSkill } from "../../types/skillTypes";
import { getAttackableNodes } from "../../utils/PathFind";

const usePlaySkillSelect = () => {
    const { characters, groundCells, mapDimension, game, playbackSpeed = 1.0 } = useCombatManager();

    const { map, currentRound } = game || {};
    const playSkillSelect = useCallback(async (skillSelect: { skillId: string; uid: string; monsterId: string }, onComplete: () => void | Promise<void>) => {
        if (!characters || !groundCells || !map || !currentRound) return;
        console.log("playSkillSelect", skillSelect)
        const { uid, monsterId } = skillSelect;
        const character = characters.find((c) => c.uid === uid && c.monsterId === monsterId);
        if (!character) return;
        // ✅ 修复：查找当前活跃的 turn（status === 1），而不是假设 turns[0]
        const currentTurn = currentRound.turns.find(
            (t: any) => t.status === 1 && t.uid === uid && t.monsterId === monsterId
        ) || null;
        if (!currentTurn) return;

        const skill: MonsterSkill | null = COMMON_SKILLS[character.selectedSkill ?? ""] ?? null;
        if (!skill) return;
        const grid = groundCells.map((row) => row.map((cell) => {
            const char = character.q === cell.q && character.r === cell.r ? null : characters.find((c) => c.q === cell.q && c.r === cell.r)
            return {
                q: cell.q,
                r: cell.r,
                walkable: char ? false : !cell.disable
            }
        }))


        character.attackables?.forEach((node) => {
            const { uid, character_id, distance } = node;
            const enemy = characters.find((c) => c.uid === uid && c.character_id === character_id);
            if (!enemy) return;
            if (!enemy?.attackEle) return;
            gsap.set(enemy.attackEle, { autoAlpha: 0 });
        });

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
            skill ?? null
        );

        character.attackables = attackableNodes;
        const tl = gsap.timeline({
            timeScale: playbackSpeed,  // ✅ 应用播放速度，同步动画速度
            onComplete: () => {
                const result = onComplete();
                // 如果返回 Promise，不等待但确保错误被捕获
                if (result instanceof Promise) {
                    result.catch(err => console.error("onComplete error:", err));
                }
            }
        });

        if (character.standEle) {
            tl.to(character.standEle, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.inOut"
            });
        }

        if (character.attackables) {
            character.attackables.forEach((node) => {
                const { q, r, uid, character_id, distance } = node;
                const enemy = characters.find((c) => c.uid === uid && c.character_id === character_id);
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

    }, [characters, groundCells, mapDimension, currentRound, map, playbackSpeed]);
    return { playSkillSelect }
}
export default usePlaySkillSelect;

