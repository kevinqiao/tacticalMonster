import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { findWalkables } from "../utils/Utlis";
import { allObstacles, allPlayers } from "./data/CombatData";
import {
  CharacterUnit,
  CombatEvent,
  GridCell,
  HexNode,
  ICombatContext,
  MapModel,
  Player,
  WalkableNode,
} from "./model/CombatModels";
import useCombatAct from "./useCombatAct";

// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const CombatContext = createContext<ICombatContext>({
  cellSize: 0,
  resourceLoad: null,
  map: { rows: 7, cols: 8 },
  gridMap: null,
  gridCells: null,
  players: [],
  eventQueue: [],
  // currentRound: null,
  // currentTurn: null,
  // currentAction: null,
  setResourceLoad: () => null,
  // setCurrentRound: () => null,
  // setCurrentTurn: () => null,
  // setCurrentAction: () => null,
  changeMap: () => null,
  changeCellSize: () => null,
  walk: () => null,
});

const CombatProvider = ({ children }: { children: ReactNode }) => {
  // console.log("combat provider....");
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [cellSize, setCellSize] = useState<number>(0);
  const [map, setMap] = useState<MapModel>({
    rows: 7,
    cols: 8,
    obstacles: allObstacles,
    disables: [
      { x: 0, y: 0 },
      { x: 7, y: 0 },
      { x: 7, y: 1 },
      { x: 0, y: 6 },
      { x: 7, y: 6 },
      { x: 7, y: 5 },
      { x: 7, y: 3 },
    ],
  });
  const [gridCells, setGridCells] = useState<GridCell[][] | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  // const [currentAction, setCurrentAction] = useState<CombatAction | null>(null);
  // const [currentTurn, setCurrentTurn] = useState<CombatTurn | null>(null);
  // const [currentRound, setCurrentRound] = useState<CombatRound | null>(null);
  const [resourceLoad, setResourceLoad] = useState<{
    character: number;
    gridContainer: number;
    gridGround: number;
    gridCover: number;
    gridStand: number;
    gridAttack: number;
  }>({ character: 0, gridContainer: 0, gridGround: 0, gridCover: 1, gridStand: 0, gridAttack: 0 });

  const gridReady = resourceLoad ? resourceLoad["gridContainer"] === 1 && resourceLoad["gridGround"] === 1 : false;
  const gridMap: HexNode[][] | null = useMemo(() => {
    if (gridReady && map) {
      const { rows, cols } = map;
      const mapGrid: HexNode[][] = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => {
          const node: HexNode = { x, y, walkable: true, type: 0 };
          const obstacle = map.obstacles?.find((o) => o.col === x && o.row === y);
          if (obstacle) {
            node.walkable = false;
            node.type = 1;
          }
          const disable = map.disables?.find((d) => d.x === x && d.y === y);
          if (disable) {
            node.walkable = false;
            node.type = 2;
          }
          return node;
        })
      );
      return mapGrid;
    }
    return null;
  }, [gridReady, map]);

  const { partner } = usePartnerManager();
  const { locale } = useLocalization();

  useEffect(() => {
    if (!gridMap) return;
    const player = allPlayers.find((p) => p.uid === "1");
    if (player?.characters) {
      const turns = player.characters
        .sort((a, b) => a.stats.speed - b.stats.speed)
        .map((c, index) => ({
          no: index,
          round: 0,
          character: c.character_id,
          uid: player.uid,
          status: 0,
        }));
      const walkables: WalkableNode[] | undefined = findWalkables(player.characters[0], gridMap, allPlayers);
      const character: CharacterUnit = player.characters[0];
      character.walkables = walkables;
      console.log(character);
      // setCurrentRound({
      //   no: 0,
      //   gameId: "1",
      //   actors: [],
      //   status: 0,
      // });
      // setCurrentTurn(turns[0]);
    }

    setPlayers(allPlayers);
  }, [gridMap]);

  useEffect(() => {
    if (!map || map.cols === 0 || map.rows === 0) return;
    const { rows, cols } = map;
    setGridCells(
      Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => ({
          x,
          y,
          gridContainer: null,
          gridGround: null,
          gridStand: null,
          gridAttack: null,
          gridCover: null,
        }))
      )
    );
  }, [map]);

  const { walk } = useCombatAct({
    eventQueue: eventQueueRef.current,
    gridMap,
    players,
  });
  const value = {
    cellSize,
    map,
    gridMap,
    gridCells,
    players,
    eventQueue: eventQueueRef.current,
    // currentRound,
    // currentTurn,
    // currentAction,
    resourceLoad,
    setResourceLoad,
    // setCurrentRound,
    // setCurrentTurn,
    // setCurrentAction,
    changeMap: setMap,
    changeCellSize: setCellSize,
    walk,
  };
  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};

export const useCombatManager = () => {
  const ctx = useContext(CombatContext);
  return ctx;
};
export default CombatProvider;
