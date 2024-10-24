import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";

import useCombatAnimate from "../animation/useCombatAnimate";
import useCombatAct from "./useCombatAct";
export enum ACT_CODE {
  WALK = 1,
  ATTACK = 2,
  DEFEND = 3,
  STANDBY = 4,
}
export interface Character {
  x: number; // 当前列号
  y: number; // 当前行号
  movementRange: number; // 角色可移动的最大范围
}
// 定义HexNode接口
export interface HexNode {
  x: number;
  y: number;
  walkable?: boolean;
}
export interface Player {
  uid: string;
  characters: CharacterUnit[];
}
interface CombatAction {
  code: number;
  data: any;
  time: number;
}
export interface CombatRound {
  no: number;
  uid: string;
  actors: { id: number; actions: CombatAction[]; actCompleted: boolean }[];
  startTime: number;
  endTime?: number;
}
export interface GridCell {
  x: number;
  y: number;
  gridContainer: SVGSVGElement | null;
  gridGround: SVGPolygonElement | null;
  gridStand: SVGPolygonElement | null;
  gridAttack: SVGCircleElement | null;
  gridCover: HTMLDivElement | null;
}
export interface ObstacleCell {
  row: number;
  col: number;
  asset: string;
  type?: number;
  walkable?: boolean;
  element?: HTMLDivElement;
}
export interface WalkableNode extends HexNode {
  path?: { x: number; y: number }[];
  distance: number; // 距离角色的步数
  level?: number;
}
export interface AttackableNode extends HexNode {
  distance: number; // 距离角色的步数
  level?: number;
}
export interface SkillableNode extends HexNode {
  distance: number; // 距离角色的步数
  level?: number;
}
export interface CharacterUnit {
  id: number;
  uid?: string;
  position: { x: number; y: number };
  movementRange: number;
  attackRange?: number;
  asset: string;
  skills?: Skill[];
  container?: HTMLDivElement;
  walkables?: WalkableNode[];
  attackables?: AttackableNode[];
  skillables?: SkillableNode[];
}
export interface MapModel {
  rows: number;
  cols: number;
  obstacles?: ObstacleCell[];
  disables?: { x: number; y: number }[];
}
export interface Skill {
  id: number;
}

interface ICombatContext {
  cellSize: number;
  // mapSize: { rows: number; cols: number };
  map: MapModel;
  gridMap: HexNode[][] | null;
  gridCells: GridCell[][] | null;
  players: Player[];
  currentRound: CombatRound | null;
  selectedCharacter: CharacterUnit | null;
  select: (character: CharacterUnit) => void;
  selectSkill: (skill: Skill) => void;
  walk: (character: CharacterUnit, to: WalkableNode) => void;
  setResourceLoad: React.Dispatch<
    React.SetStateAction<{
      character: number;
      gridContainer: number;
      gridGround: number;
      gridCover: number;
      gridStand: number;
      gridAttack: number;
    }>
  >;
  setSelectedCharacter: React.Dispatch<React.SetStateAction<CharacterUnit | null>>;
  changeMap: React.Dispatch<React.SetStateAction<MapModel>>;
  changeCellSize: React.Dispatch<React.SetStateAction<number>>;
}
const CombatContext = createContext<ICombatContext>({
  cellSize: 0,
  // mapSize: { rows: 7, cols: 8 },
  map: { rows: 7, cols: 8 },
  gridMap: null,
  gridCells: null,
  players: [],
  currentRound: null,
  selectedCharacter: null,
  select: () => null,
  selectSkill: () => null,
  walk: () => null,
  setResourceLoad: () => null,
  setSelectedCharacter: () => null,
  changeMap: () => null,
  changeCellSize: () => null,
});

const allPlayers = [
  {
    uid: "1",
    characters: [
      { id: 1, position: { x: 0, y: 1 }, asset: "/assets/hero_baboon.png", movementRange: 3 },
      { id: 2, position: { x: 1, y: 4 }, asset: "/assets/hero_tiger.png", movementRange: 2 },
    ],
  },
  {
    uid: "2",
    characters: [
      { id: 1, position: { x: 6, y: 2 }, asset: "/assets/hero_elephant.png", movementRange: 2 },
      { id: 2, position: { x: 5, y: 5 }, asset: "/assets/hero_rhino.png", movementRange: 2 },
    ],
  },
];
const allObstacles = [
  { row: 0, col: 3, asset: "/assets/obstacle1.png" },
  { row: 2, col: 4, asset: "/assets/obstacle2.png" },
];

const CombatProvider = ({ children }: { children: ReactNode }) => {
  const initRef = useRef<boolean>(false);
  const [cellSize, setCellSize] = useState<number>(0);
  // const [mapSize, setMapSize] = useState<{ rows: number; cols: number }>({ rows: 7, cols: 8 });
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState<CombatRound | null>({
    no: 1,
    uid: "1",
    actors: [
      { id: 1, actions: [], actCompleted: false },
      { id: 2, actions: [], actCompleted: false },
    ],
    startTime: Date.now(),
  });
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterUnit | null>(null);
  const [resourceLoad, setResourceLoad] = useState<{
    character: number;
    gridContainer: number;
    gridGround: number;
    gridCover: number;
    gridStand: number;
    gridAttack: number;
  }>({ character: 0, gridContainer: 0, gridGround: 0, gridCover: 1, gridStand: 0, gridAttack: 0 });

  const gridMap: HexNode[][] | null = useMemo(() => {
    if (gridCells && map) {
      const { rows, cols } = map;
      const mapGrid: HexNode[][] = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => {
          const node = { x, y, walkable: true };
          const obstacle = map.obstacles?.find((o) => o.col === x && o.row === y);
          if (obstacle) node.walkable = false;
          return node;
        })
      );
      return mapGrid;
    }
    return null;
  }, [gridCells, map]);

  const { walk, getWalkables } = useCombatAct({
    cellSize,
    gridCells,
    gridMap,
    players,
    map,
    currentRound,
    selectedCharacter,
    setSelectedCharacter,
  });
  const { playSelect, playInit } = useCombatAnimate();
  const { partner } = usePartnerManager();
  const { locale } = useLocalization();

  useEffect(() => {
    const playerList: Player[] = [];
    for (const player of allPlayers) {
      const characters = player.characters.map((c, index) => ({ ...c, uid: player.uid }));
      playerList.push({ ...player, characters });
      if (player.uid === "1") setSelectedCharacter(player.characters[0]);
    }
    setPlayers(playerList);
  }, []);
  useEffect(() => {
    if (!map || map.cols === 0 || map.rows === 0) return;
    const { rows, cols } = map;
    // setMap((pre) => ({ ...pre, rows, cols }));
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
    console.log("initialize map...");
  }, [map]);
  useEffect(() => {
    const allLoaded = Object.values(resourceLoad).every((value) => value === 1);
    console.log(resourceLoad);
    if (!initRef.current && players && gridCells && allLoaded) {
      initRef.current = true;
      const characters = players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
      playInit(gridCells, characters, cellSize);
    }
  }, [resourceLoad, players, gridCells, cellSize, playInit]);

  useEffect(() => {
    if (gridCells && selectedCharacter) {
      const walkables: WalkableNode[] | undefined = getWalkables(selectedCharacter);
      selectedCharacter.walkables = walkables;
      playSelect({ gridCells, unselects: [], walkables });
    }
  }, [gridCells, selectedCharacter]);
  const select = useCallback(
    (character: CharacterUnit) => {
      const walkables: WalkableNode[] | undefined = getWalkables(character);
      if (walkables && gridCells) {
        character.walkables = walkables;
        // console.log(character);
        setSelectedCharacter((pre) => {
          playSelect({ gridCells, unselects: pre?.walkables, walkables });
          return character;
        });
        if (currentRound) {
          const index = currentRound.actors.findIndex((a) => a.id === character.id);
          if (index >= 0) {
            const actor = currentRound.actors[index];
            currentRound.actors.splice(index, 1);
            currentRound.actors = [actor, ...currentRound.actors];
          }
        }
        console.log(currentRound?.actors);
      }
    },
    [currentRound, gridCells, getWalkables]
  );
  const selectSkill = useCallback((skill: Skill) => {
    console.log("select skill");
  }, []);

  const value = {
    cellSize,
    map,
    gridMap,
    gridCells,
    players,
    currentRound,
    selectedCharacter,
    select,
    selectSkill,
    walk,
    setResourceLoad,
    setSelectedCharacter,
    changeMap: setMap,
    changeCellSize: setCellSize,
  };

  return <CombatContext.Provider value={value}> {children} </CombatContext.Provider>;
};
export const useCombatManager = () => {
  return useContext(CombatContext);
};
export default CombatProvider;
