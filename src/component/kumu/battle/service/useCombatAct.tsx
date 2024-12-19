import { useCallback } from "react";
import { ACT_CODE, CharacterUnit, EVENT_TYPE } from "../model/CombatModels";
import { findPath } from "../utils/PathFind";
import { useCombatManager } from "./CombatManager";

const useCombatAct = () => {
  const { characters, gridCells, hexCell, eventQueue, currentRound } = useCombatManager()


  const attack = useCallback(async (to: { q: number; r: number }) => {
    console.log("walking");
  }, []);

  const walk = useCallback(async (to: { q: number; r: number }) => {
    // const character = characters?.find((c) => c.id === currentRound?.turns[0].character);
    if (!characters || !gridCells) return;
    console.log('characters', characters[0]);
    const path = findPath(gridCells,
      { x: characters[0].q, y: characters[0].r },
      { x: to.q, y: to.r }
    );

    if (!path) return;

    eventQueue.push({
      type: EVENT_TYPE.ACTION,
      name: "walk",
      status: 0,
      gameId: "current",
      time: Date.now(),
      data: {
        uid: "1",
        character: characters[0].character_id,
        act: ACT_CODE.WALK,
        data: { path },
      },
    });
  }, [characters, currentRound, gridCells]);

  const standBy = useCallback((character: CharacterUnit) => {
    console.log("stand...");
  }, []);
  const defend = useCallback(() => {
    console.log("defend....");
  }, []);
  return { walk, attack, defend, standBy };
};
export default useCombatAct;
