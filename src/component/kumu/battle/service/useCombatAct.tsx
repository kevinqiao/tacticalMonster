import { useConvex } from "convex/react";
import { useCallback } from "react";
import { api } from "../../../../convex/_generated/api";
import { CharacterUnit, EVENT_TYPE } from "../types/CombatTypes";
import { findPath } from "../utils/PathFind";
import { useCombatManager } from "./CombatManager";

const useCombatAct = () => {
  const { map, gameId, characters, gridCells, hexCell, eventQueue, currentRound } = useCombatManager()
  const convex = useConvex();

  const attack = useCallback(async (to: { q: number; r: number }) => {
    console.log("walking");
  }, []);

  const walk = useCallback(async (to: { q: number; r: number }) => {
    // const character = characters?.find((c) => c.id === currentRound?.turns[0].character);
    console.log("walk", to);
    if (!gameId || !characters || !gridCells || !currentRound || !map) return;
    const currentTurn = currentRound.turns.find((t) => t.status === 1);
    if (!currentTurn) return;
    console.log("currentTurn", currentTurn);
    const { uid, character_id } = currentTurn;
    const character = characters.find(c => c.character_id === character_id && c.uid === uid);
    if (!character) return;
    const col = map.direction === 1 ? map.cols - to.q - 1 : to.q;
    console.log("col", col)
    const path = findPath(gridCells,
      { x: character.q, y: character.r },
      { x: col, y: to.r }
    );
    console.log(path);
    if (!path) return;

    eventQueue.push({
      type: EVENT_TYPE.ACTION,
      name: "walk",
      status: 0,
      gameId: "current",
      time: Date.now(),
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

  }, [map, gameId, characters, currentRound, gridCells, convex]);

  const standBy = useCallback((character: CharacterUnit) => {
    console.log("stand...");
  }, []);
  const defend = useCallback(() => {
    console.log("defend....");
  }, []);
  return { walk, attack, defend, standBy };
};
export default useCombatAct;
