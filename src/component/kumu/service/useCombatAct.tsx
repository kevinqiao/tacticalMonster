import { useCallback } from "react";
import { getReachableTiles, HexNode } from "../utils/Utlis";
import { CharacterUnit, Player } from "./CombatManager";

interface Props {
  //   obstacles: ObstacleCell[];
  //   pathCells: PathCell[][] | null;
  gridMap: HexNode[][] | null;
  players: Player[];
}
const useCombatAct = ({ gridMap, players }: Props) => {
  const getRunables = useCallback(
    (character: CharacterUnit) => {
      if (!gridMap) return undefined;
      const characters = players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
      const grids: HexNode[][] = gridMap.map<HexNode[]>((row) =>
        row.map((node) => {
          const { x, y } = node;
          const c = characters.find((c) => c.position.x === x && c.position.y === y);
          return { ...node, walkable: c ? false : true };
        })
      );
      const { x, y } = character.position;
      const walkablCells = getReachableTiles(grids, { x, y, movementRange: 2 });
      console.log(walkablCells);
      return walkablCells;
    },
    [gridMap]
  );
  const attack = useCallback(
    (character: CharacterUnit, dx: number, dy: number) => {
      console.log("walking");
    },
    [gridMap, players]
  );
  const walk = useCallback(
    (character: CharacterUnit, dx: number, dy: number) => {
      console.log("walking," + dx + "-" + dy);
    },
    [gridMap, players]
  );
  const heal = useCallback(
    (character: CharacterUnit) => {
      console.log("healing...");
    },
    [gridMap, players]
  );
  return { walk, attack, heal, getRunables };
};
export default useCombatAct;
