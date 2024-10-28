import gsap from "gsap";
import { useCallback } from "react";
import useCombatAnimate from "../animation/useCombatAnimate";
import { HexNode } from "../utils/Utlis";
import { CharacterUnit, CombatRound, GridCell, MapModel, Player } from "./CombatModels";

interface Props {
  cellSize: number;
  currentRound: CombatRound | null;
  gridMap: HexNode[][] | null;
  gridCells: GridCell[][] | null;
  players: Player[] | null;
  map: MapModel;
  selectedCharacter: CharacterUnit | null;
  setSelectedCharacter: React.Dispatch<React.SetStateAction<CharacterUnit | null>>;
}
const useCombatAct = ({ cellSize, gridMap, gridCells, players, map, currentRound, selectedCharacter }: Props) => {
  const { playWalk, playUnSelect, playTurnOver, playTurnReady } = useCombatAnimate();

  const attack = useCallback(
    (character: CharacterUnit, dx: number, dy: number) => {
      console.log("walking");
    },
    [gridMap, players]
  );
  const walk = useCallback(
    (to: { x: number; y: number }) => {
      console.log(players);
      if (!map || !currentRound || !selectedCharacter || !selectedCharacter.walkables) return;

      const walkNode = selectedCharacter.walkables.find((w) => w.x === to.x && w.y === to.y);
      if (walkNode?.path && gridCells) {
        const { x: cx, y: cy } = selectedCharacter.position;
        const path: { x: number; y: number }[] = walkNode.path;
        const timeline = gsap.timeline({
          onComplete: () => {
            selectedCharacter.position = to;
            timeline.kill();
          },
        });
        const cell = gridCells[cy][cx];
        if (cell) {
          timeline.to(cell.gridStand, { autoAlpha: 0, duration: 0.1 });
          playUnSelect({ gridCells, walkables: selectedCharacter.walkables, timeline });
        }
        timeline.to({}, {}, ">");
        playWalk(selectedCharacter, path, cellSize, timeline);
        if (walkNode.level === 0) {
          console.log("complete turn");
        } else {
          console.log("play stand to do next");
        }
        timeline.play();
        // const actor = currentRound.actors.find((a) => a.id === character.id);
        // if (actor) {
        //   actor.actions.push({ code: ACT_CODE.WALK, data: to, time: Date.now() });
        //   if (to.level === 0 || actor.actions.length === 2) actor.actCompleted = true;
        //   playWalk(selectedCharacter, path, cellSize, null);
        // }
      }
    },
    [players, gridCells, map, currentRound, selectedCharacter]
  );
  const stand = useCallback(
    (character: CharacterUnit) => {
      console.log("stand...");
    },
    [gridMap, players]
  );
  const defend = useCallback(() => {
    const tl = gsap.timeline();
    // if (selectedCharacter?.walkables) {
    // }
  }, [gridMap, players, selectedCharacter]);
  return { walk, attack, defend };
};
export default useCombatAct;
