/**
 * Tactical Monster 行动处理器
 */

import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import usePlaySkill from "../../animation/usePlaySkill";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import usePlayWalk from "../../animation/usePlayWalk";
import { useCombatManager } from "../CombatManager";

const useActionProcessor = () => {
    const { user } = useUserManager();
    const {
        characters,
        gridCells,
        hexCell,
        currentRound,
        resourceLoad
    } = useCombatManager();

    const { playWalk } = usePlayWalk();
    const { playSkillSelect } = usePlaySkillSelect();
    const { playSkill } = usePlaySkill();

    const processSkillSelect = useCallback(({ data, onComplete }: { data: any, onComplete: () => void }) => {
        const { uid, character_id, skillId } = data;
        const currentTurn = currentRound?.turns?.find((t: any) => t.uid === uid && t.character_id === character_id);
        if (!currentTurn) return;
        currentTurn.skillSelect = skillId;
        playSkillSelect({ uid, character_id, skillId }, onComplete);
    }, [resourceLoad, characters, gridCells, hexCell, currentRound, playSkillSelect]);

    const processWalk = useCallback(({ data, onComplete }: { data: any, onComplete: () => void }) => {
        if (!characters || !gridCells || !hexCell) return;

        const { uid, character_id, path } = data;
        const character = characters.find((c) => c.character_id === character_id && c.uid === uid);
        const { x, y } = path[path.length - 1];

        if (character && (character.q !== x || character.r !== y)) {
            character.q = x;
            character.r = y;
            playWalk(character, path, onComplete);
        } else {
            onComplete();
        }
    }, [user, resourceLoad, characters, gridCells, hexCell, playWalk]);

    const processAttack = useCallback(({ data, onComplete }: { data: any, onComplete: () => void }) => {
        if (!characters) {
            onComplete();
            return;
        }
        
        const { attacker, target, skillId } = data;
        const attackerChar = characters.find(
            c => c.uid === attacker?.uid && c.character_id === attacker?.character_id
        );
        const targetChar = characters.find(
            c => c.uid === target?.uid && c.character_id === target?.character_id
        );
        
        if (attackerChar && targetChar) {
            const skillIdToUse = skillId || attacker?.skillId || attackerChar.skills?.[0]?.id || "";
            if (skillIdToUse) {
                playSkill(attackerChar, skillIdToUse, [targetChar], onComplete);
            } else {
                onComplete();
            }
        } else {
            onComplete();
        }
    }, [characters, gridCells, hexCell, playSkill]);

    const processSkill = useCallback((data: any) => {
        // TODO: 实现技能处理
    }, [characters, gridCells, hexCell]);

    const processDefend = useCallback((data: any) => {
        // TODO: 实现防御处理
    }, [characters, gridCells, hexCell]);

    const processStandby = useCallback((data: any) => {
        // TODO: 实现待命处理
    }, [characters, gridCells, hexCell]);

    return {
        processWalk,
        processAttack,
        processSkill,
        processDefend,
        processStandby,
        processSkillSelect
    };
};

export default useActionProcessor;


