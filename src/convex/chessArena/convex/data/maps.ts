export type ChessMapConfig = {
  mapId: string;
  name: string;
  rows: number;
  cols: number;
  obstacles: Array<{ q: number; r: number }>;
  disables: Array<{ q: number; r: number }>;
};

export const CHESS_MAP_CATALOG: ChessMapConfig[] = [
  {
    mapId: "map_yard",
    name: "监牢庭院",
    rows: 7,
    cols: 8,
    obstacles: [
      { q: 3, r: 2 },
      { q: 3, r: 4 },
      { q: 4, r: 3 },
    ],
    disables: [],
  },
  {
    mapId: "map_forge",
    name: "烬核熔炉",
    rows: 7,
    cols: 8,
    obstacles: [
      { q: 2, r: 1 },
      { q: 5, r: 5 },
    ],
    disables: [{ q: 0, r: 0 }],
  },
  {
    mapId: "map_reef",
    name: "潮汐暗礁",
    rows: 7,
    cols: 8,
    obstacles: [
      { q: 1, r: 3 },
      { q: 2, r: 3 },
      { q: 5, r: 2 },
    ],
    disables: [],
  },
];

export const CHESS_MAP_MAP: Record<string, ChessMapConfig> = Object.fromEntries(
  CHESS_MAP_CATALOG.map((map) => [map.mapId, map]),
);
