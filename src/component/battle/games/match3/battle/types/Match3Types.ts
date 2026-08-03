export {
  MATCH3_GRID_ROWS,
  MATCH3_GRID_COLS,
  MATCH3_CANDY_TYPES,
  Match3GameStatus,
  GameInteractionPhase,
} from '@/convex/match3Arena/convex/types/Match3Types';

export type {
  Match3Cell,
  Match3GameState,
  Match3TurnStep,
  Match3Rule,
} from '@/convex/match3Arena/convex/types/Match3Types';

export type GameReport = {
  baseScore: number;
  totalScore: number;
};

export const CANDY_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#a78bfa',
  '#fb923c',
  '#38bdf8',
];
