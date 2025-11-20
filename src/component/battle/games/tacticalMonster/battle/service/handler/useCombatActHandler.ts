/**
 * Tactical Monster 战斗操作处理器
 * 参考 solitaireSolo 的 useActHandler 模式
 */

import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import { Skill } from "../../types/CharacterTypes";
import { GameCharacter } from "../../types/CombatTypes";
import { findPath } from "../../utils/PathFind";
import { useCombatManager } from "../CombatManager";

const useCombatActHandler = () => {
    const { playSkillSelect } = usePlaySkillSelect();
    const { user } = useUserManager();
    const {
        map,
        gameId,
        characters,
        gridCells,
        hexCell,
        eventQueue,
        currentRound,
        setActiveSkill
    } = useCombatManager();
    const convex = useConvex();

    const attack = useCallback(async (character: GameCharacter) => {
        if (!gameId) return;

        const currentTurn = currentRound?.turns?.find(
            (t: any) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        const skillId = currentTurn.skillSelect ?? currentTurn.skills?.[0];
        if (!skillId) return;

        const eventData = {
            attacker: {
                uid: currentTurn.uid,
                character_id: currentTurn.character_id,
                skillSelect: skillId
            },
            target: {
                uid: character.uid,
                character_id: character.character_id
            }
        };

        try {
            const result = await convex.mutation(api.service.gameManager.attack, {
                gameId,
                data: eventData
            });

            if (result.ok) {
                eventQueue.push({
                    name: "attack",
                    status: 0,
                    gameId,
                    uid: currentTurn.uid,
                    time: Date.now(),
                    data: eventData
                });
            }
        } catch (error) {
            console.error("Attack failed", error);
        }
    }, [convex, eventQueue, currentRound, gameId, user]);

    const walk = useCallback(async (to: { q: number; r: number }) => {
        if (!gameId || !characters || !gridCells || !currentRound || !map) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        const { uid, character_id } = currentTurn;
        const character = characters.find(
            c => c.character_id === character_id && c.uid === uid
        );
        if (!character) return;

        const col = map.direction === 1 ? map.cols - to.q - 1 : to.q;
        const path = findPath(
            gridCells,
            { x: character.q ?? 0, y: character.r ?? 0 },
            { x: col, y: to.r }
        );

        if (!path) return;

        try {
            const result = await convex.mutation(api.service.gameManager.walk, {
                gameId,
                uid,
                characterId: character_id,
                to: { q: col, r: to.r }
            });

            if (result.ok) {
                eventQueue.push({
                    name: "walk",
                    status: 0,
                    uid,
                    gameId,
                    time: Date.now(),
                    data: {
                        uid,
                        character_id,
                        path
                    }
                });
            }
        } catch (error) {
            console.error("Walk failed", error);
        }
    }, [user, eventQueue, map, gameId, characters, currentRound, gridCells, convex]);

    const selectSkill = useCallback(async (skill: Skill) => {
        if (!currentRound || !gameId) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        currentTurn.skillSelect = skill.id;
        setActiveSkill(skill);

        playSkillSelect(
            {
                uid: currentTurn.uid,
                character_id: currentTurn.character_id,
                skillId: skill.id
            },
            () => { }
        );

        try {
            await convex.mutation(api.service.gameManager.selectSkill, {
                gameId,
                data: {
                    skillId: skill.id
                }
            });
        } catch (error) {
            console.error("Select skill failed", error);
        }
    }, [currentRound, gameId, playSkillSelect, setActiveSkill, convex]);

    const standBy = useCallback((character: GameCharacter) => {
        console.log("standBy", character);
    }, []);

    const defend = useCallback(() => {
        console.log("defend");
    }, []);

    const gameOver = useCallback(async () => {
        if (!gameId) return;

        try {
            await convex.mutation(api.service.gameManager.gameOver, {
                gameId
            });
        } catch (error) {
            console.error("Game over failed", error);
        }
    }, [gameId, convex]);

    return {
        walk,
        attack,
        defend,
        standBy,
        selectSkill,
        gameOver
    };
};

export default useCombatActHandler;


