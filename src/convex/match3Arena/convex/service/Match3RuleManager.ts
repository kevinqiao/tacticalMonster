import {
  Match3GameState,
  Match3GameStatus,
  Match3Rule,
  GameInteractionPhase,
} from "../types/Match3Types";
import { findValidMoves, Match3GameEngine } from "./Match3GameEngine";

export class Match3RuleManager implements Match3Rule {
  private game: Match3GameState;
  private phase: GameInteractionPhase;

  constructor(game: Match3GameState, phase: GameInteractionPhase = GameInteractionPhase.idle) {
    this.game = game;
    this.phase = phase;
  }

  isValidSwap(r1: number, c1: number, r2: number, c2: number): boolean {
    if (this.phase !== GameInteractionPhase.idle) return false;
    if (this.game.status !== Match3GameStatus.PLAYING) return false;
    return Match3GameEngine.isValidSwap(this.game.grid, r1, c1, r2, c2);
  }

  hasValidMoves(): boolean {
    return findValidMoves(this.game.grid).length > 0;
  }

  isGameOver(): boolean {
    if (this.game.status !== Match3GameStatus.PLAYING) return true;
    return !this.hasValidMoves();
  }
}
