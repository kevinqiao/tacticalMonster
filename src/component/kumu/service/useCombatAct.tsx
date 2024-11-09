import { useCallback, useMemo } from "react";
import { getHexNeighbors } from "../utils/Utlis";
import {
  ACT_CODE,
  CharacterUnit,
  CombatAction,
  CombatEvent,
  CombatRound,
  CombatTurn,
  EVENT_TYPE,
  HexNode,
  Player,
  WalkableNode,
} from "./model/CombatModels";

interface Props {
  eventQueue: CombatEvent[];
  gridMap: HexNode[][] | null;
  players: Player[] | null;
  currentRound: CombatRound | null;
  currentTurn: CombatTurn | null;
  currentAction: CombatAction | null;
  setCurrentRound: React.Dispatch<React.SetStateAction<CombatRound | null>>;
  setCurrentTurn: React.Dispatch<React.SetStateAction<CombatTurn | null>>;
  setCurrentAction: React.Dispatch<React.SetStateAction<CombatAction | null>>;
}
const useCombatAct = ({
  eventQueue,
  gridMap,
  players,
  currentAction,
  currentTurn,
  currentRound,
  setCurrentAction,
  setCurrentTurn,
  setCurrentRound,
}: Props) => {
  const characters = useMemo(() => {
    if (players) return players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
  }, [players]);

  const attack = useCallback(
    (character: CharacterUnit, dx: number, dy: number) => {
      console.log("walking");
    },
    [gridMap, players]
  );
  const walk = useCallback(
    (to: { x: number; y: number }) => {
      if (!currentTurn || !currentRound || !characters || !gridMap) return;
      const character = characters.find((c) => c.id === currentTurn.character);
      if (character) {
        const walkNode = character.walkables?.find((w) => w.x === to.x && w.y === to.y);
        if (walkNode) {
          const action: CombatAction = { id: Date.now() + "", code: ACT_CODE.WALK, data: to, status: 0 };
          // setCurrentAction(action);
          eventQueue.push({ type: EVENT_TYPE.TURN_ACT, data: action });
          if (walkNode.turnEnd) {
            const nextTurn = currentRound.turns.find((t) => t.no === currentTurn.no + 1);
            if (nextTurn) {
              eventQueue.push({ type: EVENT_TYPE.TURN_INIT, data: nextTurn });
            }
          } else {
            const neighbors: HexNode[] = getHexNeighbors(gridMap, to);
            const nodes = neighbors.filter((n) => {
              const ch = characters.find((c) => c.position.x == n.x && c.position.y === n.y);
              return !ch || (ch.id === character.id && ch.uid === character.uid) ? true : false;
            });
            nodes.forEach((c) => {
              const w: WalkableNode = c as WalkableNode;
              w.path = [to, { x: c.x, y: c.y }];
              w.turnEnd = 1;
            });
            action.result = { walkables: nodes };
          }
        }
      }
    },
    [currentTurn, currentRound, characters, gridMap]
  );

  const standBy = useCallback(
    (character: CharacterUnit) => {
      console.log("stand...");
    },
    [gridMap, players]
  );
  const defend = useCallback(() => {
    console.log("defend....");
  }, [gridMap, players]);
  return { walk, attack, defend, standBy };
};
export default useCombatAct;
