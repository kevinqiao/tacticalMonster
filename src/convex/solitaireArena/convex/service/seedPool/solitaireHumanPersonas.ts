/** Think-time multipliers per op kind (applied on top of base sim seconds). */
export type ThinkTimeScale = {
  draw: number;
  recycle: number;
  move: number;
  foundation: number;
};

export type HumanPersona = {
  id: string;
  foundationTakeRate: number;
  maxFoundationBurst: number;
  tableauTopN: number;
  skipOptimalDrawRate: number;
  drawBeforeActRate: number;
  earlyExitBias: number;
  stallMovesBeforeExit: number;
  maxTotalRecycles: number;
  /** Max recycle ops since last score gain before the bot exits instead of paying -20 again. */
  maxRecyclesWithoutScore: number;
  minMovesBeforeRecycle: number;
  thinkTimeScale: ThinkTimeScale;
};

export const HUMAN_PERSONAS: HumanPersona[] = [
  {
    id: "aggressive",
    foundationTakeRate: 0.92,
    maxFoundationBurst: 3,
    tableauTopN: 4,
    skipOptimalDrawRate: 0.01,
    drawBeforeActRate: 0.04,
    earlyExitBias: -2,
    stallMovesBeforeExit: 20,
    maxTotalRecycles: 10,
    maxRecyclesWithoutScore: 2,
    minMovesBeforeRecycle: 5,
    thinkTimeScale: { draw: 0.85, recycle: 0.9, move: 0.9, foundation: 0.75 },
  },
  {
    id: "balanced",
    foundationTakeRate: 0.78,
    maxFoundationBurst: 2,
    tableauTopN: 6,
    skipOptimalDrawRate: 0.03,
    drawBeforeActRate: 0.08,
    earlyExitBias: 0,
    stallMovesBeforeExit: 18,
    maxTotalRecycles: 12,
    maxRecyclesWithoutScore: 2,
    minMovesBeforeRecycle: 4,
    thinkTimeScale: { draw: 1, recycle: 1, move: 1, foundation: 1 },
  },
  {
    id: "scanner",
    foundationTakeRate: 0.62,
    maxFoundationBurst: 1,
    tableauTopN: 8,
    skipOptimalDrawRate: 0.06,
    drawBeforeActRate: 0.14,
    earlyExitBias: 2,
    stallMovesBeforeExit: 16,
    maxTotalRecycles: 14,
    maxRecyclesWithoutScore: 2,
    minMovesBeforeRecycle: 3,
    thinkTimeScale: { draw: 1.25, recycle: 1.1, move: 1.15, foundation: 1.2 },
  },
  {
    id: "conservative",
    foundationTakeRate: 0.7,
    maxFoundationBurst: 2,
    tableauTopN: 7,
    skipOptimalDrawRate: 0.04,
    drawBeforeActRate: 0.1,
    earlyExitBias: 3,
    stallMovesBeforeExit: 14,
    maxTotalRecycles: 10,
    maxRecyclesWithoutScore: 1,
    minMovesBeforeRecycle: 6,
    thinkTimeScale: { draw: 1.1, recycle: 1.05, move: 1.05, foundation: 1.1 },
  },
  {
    id: "early_exit",
    foundationTakeRate: 0.8,
    maxFoundationBurst: 2,
    tableauTopN: 5,
    skipOptimalDrawRate: 0.02,
    drawBeforeActRate: 0.05,
    earlyExitBias: 6,
    stallMovesBeforeExit: 12,
    maxTotalRecycles: 8,
    maxRecyclesWithoutScore: 1,
    minMovesBeforeRecycle: 4,
    thinkTimeScale: { draw: 0.95, recycle: 0.95, move: 0.95, foundation: 0.9 },
  },
  {
    id: "grinder",
    foundationTakeRate: 0.58,
    maxFoundationBurst: 1,
    tableauTopN: 9,
    skipOptimalDrawRate: 0.08,
    drawBeforeActRate: 0.12,
    earlyExitBias: -4,
    stallMovesBeforeExit: 24,
    maxTotalRecycles: 16,
    maxRecyclesWithoutScore: 2,
    minMovesBeforeRecycle: 3,
    thinkTimeScale: { draw: 1.35, recycle: 1.2, move: 1.25, foundation: 1.3 },
  },
];

export function personaForRollout(rolloutIndex: number): HumanPersona {
  return HUMAN_PERSONAS[rolloutIndex % HUMAN_PERSONAS.length]!;
}
