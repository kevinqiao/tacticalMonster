import gsap from "gsap";
import { useCallback } from "react";
import useCombatAnimate from "../animation/useCombatAnimate";
import { getReachableTiles, HexNode } from "../utils/Utlis";
import { ACT_CODE, CharacterUnit, CombatRound, GridCell, MapModel, Player, WalkableNode } from "./CombatManager";

interface Props {
  cellSize: number;
  currentRound: CombatRound | null;
  gridMap: HexNode[][] | null;
  gridCells: GridCell[][] | null;
  players: Player[];
  map: MapModel;
  selectedCharacter: CharacterUnit | null;
  setSelectedCharacter: React.Dispatch<React.SetStateAction<CharacterUnit | null>>;
}
const useCombatAct = ({ cellSize, gridMap, players, map, currentRound, selectedCharacter }: Props) => {
  const { playWalk, playTurnOver, playTurnReady } = useCombatAnimate();
  const getWalkables = useCallback(
    (character: CharacterUnit) => {
      if (!gridMap) return undefined;
      const characters = players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
      const grids: HexNode[][] = gridMap.map<HexNode[]>((row, y) =>
        row.map((node, x) => {
          const c = characters.find((c) => c.position.x === x && c.position.y === y);
          return { ...node, x, y, walkable: c ? false : node.walkable };
        })
      );
      const { x, y } = character.position;
      const walkablCells = getReachableTiles(grids, { x, y, movementRange: character.movementRange });
      if (walkablCells)
        return walkablCells
          .filter((w) => w.node.walkable)
          .map((c) => ({
            x: c.node.x,
            y: c.node.y,
            path: c.path,
            distance: c.totalCost,
            level: c.totalCost < character.movementRange ? 1 : 0,
          }));
      return undefined;
    },
    [gridMap, players]
  );
  const attack = useCallback(
    (character: CharacterUnit, dx: number, dy: number) => {
      console.log("walking");
    },
    [gridMap, players]
  );
  const walk = useCallback(
    (character: CharacterUnit, to: WalkableNode) => {
      if (!map || !currentRound || !to.path) return;
      const path: { x: number; y: number }[] = to.path;
      const actor = currentRound.actors.find((a) => a.id === character.id);
      if (actor) {
        actor.actions.push({ code: ACT_CODE.WALK, data: to, time: Date.now() });
        if (to.level === 0 || actor.actions.length === 2) actor.actCompleted = true;
        playWalk(character, path, cellSize, null);
      }
    },
    [map, currentRound]
  );
  const heal = useCallback(
    (character: CharacterUnit) => {
      console.log("healing...");
    },
    [gridMap, players]
  );
  const defend = useCallback(() => {
    const tl = gsap.timeline();
    // if (selectedCharacter?.walkables) {
    // }
  }, [gridMap, players, selectedCharacter]);
  return { walk, attack, heal, defend, getWalkables };
};
export default useCombatAct;
