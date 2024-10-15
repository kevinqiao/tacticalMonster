import { useCallback } from "react";
import { CharacterUnit, ObstacleCell, PathCell, Player } from "./CombatManager";

interface Props {
  obstacles: ObstacleCell[];
  pathCells: PathCell[][] | null;
  players: Player[];
}
const useCombatAct = ({ obstacles, players, pathCells }: Props) => {
  const stand = useCallback(
    (character: CharacterUnit) => {
      console.log("walking");
    },
    [obstacles, players, pathCells]
  );
  const attack = useCallback(
    (character: CharacterUnit, dx: number, dy: number) => {
      console.log("walking");
    },
    [obstacles, players, pathCells]
  );
  const walk = useCallback(
    (character: CharacterUnit, dx: number, dy: number) => {
      console.log("walking," + dx + "-" + dy);
    },
    [obstacles, players, pathCells]
  );
  const heal = useCallback(
    (character: CharacterUnit) => {
      console.log("healing...");
    },
    [obstacles, players, pathCells]
  );
  return { walk, attack, heal };
};
export default useCombatAct;
