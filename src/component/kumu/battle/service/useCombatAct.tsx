import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/_generated/api";
import usePlaySkillSelect from "../animation/usePlaySkillSelect";
import { Skill } from "../types/CharacterTypes";
import { GameCharacter } from "../types/CombatTypes";
import { findPath } from "../utils/PathFind";
import { useCombatManager } from "./CombatManager";

const useCombatAct = () => {
  const { playSkillSelect } = usePlaySkillSelect();
  const { user } = useUserManager();
  const { map, gameId, characters, gridCells, hexCell, eventQueue, currentRound, setActiveSkill } = useCombatManager()
  const convex = useConvex();

  const attack = useCallback(async (character: GameCharacter) => {
    if (!gameId) return;
    const currentTurn = currentRound?.turns?.find((t: any) => t.status === 1 || t.status === 2);
    if (!currentTurn) return;
    const skillId = currentTurn.skillSelect ?? currentTurn.skills?.[0];
    if (currentTurn.uid === user.uid) {
      eventQueue.push({
        name: "attack",
        status: 0,
        gameId: gameId,
        data: {
          attacker: { uid: currentTurn.uid, character_id: currentTurn.character_id, skillSelect: skillId },
          target: { uid: character.uid, character_id: character.character_id }
        },
      })
    };
    const res = await convex.action(api.service.tmGameProxy.attack, {
      gameId,
      uid: character.uid,
      token: "test-token",
      data: {
        attacker: { uid: currentTurn.uid, character_id: currentTurn.character_id, skillSelect: skillId },
        target: { uid: character.uid, character_id: character.character_id }
      }
    });
    console.log("attack res", res);
  }, [convex, eventQueue, characters, currentRound, gameId]);

  const walk = useCallback(async (to: { q: number; r: number }) => {
    // const character = characters?.find((c) => c.id === currentRound?.turns[0].character);
    console.log("walk", to);
    if (!gameId || !characters || !gridCells || !currentRound || !map) return;
    const currentTurn = currentRound.turns.find((t) => t.status === 1 || t.status === 2);
    if (!currentTurn) return;

    const { uid, character_id } = currentTurn;
    const character = characters.find(c => c.character_id === character_id && c.uid === uid);
    if (!character) return;
    const col = map.direction === 1 ? map.cols - to.q - 1 : to.q;

    const path = findPath(gridCells,
      { x: character.q ?? 0, y: character.r ?? 0 },
      { x: col, y: to.r }
    );

    if (!path) return;

    eventQueue.push({
      name: "walk",
      status: 0,
      uid: user.uid,
      data: {
        uid,
        character_id,
        path
      },
    });

    const res = await convex.action(api.service.tmGameProxy.walk, {
      gameId,
      character_id,
      uid,
      token: "test-token",
      to: { q: col, r: to.r }
    });
    if (!res) {
      console.log("walk failed");
    } else {
      console.log("walk success");
    }

  }, [user, eventQueue, map, gameId, characters, currentRound, gridCells, convex]);
  const selectSkill = useCallback(async (skill: Skill) => {

    if (!currentRound || !gameId) return;

    const currentTurn = currentRound.turns.find((t) => t.status === 1 || t.status === 2);
    if (!currentTurn) return;
    currentTurn.skillSelect = skill.id;
    setActiveSkill(skill);
    playSkillSelect({ uid: currentTurn.uid, character_id: currentTurn.character_id, skillId: skill.id }, () => { });
    const res = await convex.action(api.service.tmGameProxy.selectSkill, {
      gameId,
      uid: currentTurn.uid,
      token: "test-token",
      data: {
        skillId: skill.id
      }
    });
  }, [currentRound, characters, gameId, playSkillSelect, setActiveSkill]);
  const standBy = useCallback((character: GameCharacter) => {
    console.log("stand...");
  }, []);
  const defend = useCallback(() => {
    console.log("defend....");
  }, []);
  return { walk, attack, defend, standBy, selectSkill };
};
export default useCombatAct;
