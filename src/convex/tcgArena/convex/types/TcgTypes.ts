/**
 * TCG Boss fight — vertical slice types (season 1).
 * Cards have no levels; effects use a small fixed vocabulary.
 */

export const TCG_EFFECT_IDS = [
  "deal_damage",
  "draw",
  "gain_armor",
  "heal_hero",
] as const;

export type TcgEffectId = (typeof TCG_EFFECT_IDS)[number];

export type TcgCardType = "spell" | "minion";

export type TcgCardDef = {
  cardId: string;
  name: string;
  cost: number;
  type: TcgCardType;
  effectId?: TcgEffectId;
  params?: Record<string, unknown>;
  attack?: number;
  health?: number;
  keywords?: string[];
  rarity: string;
  faction: string;
};

export type TcgBossTurnOp =
  | { op: "deal_damage_hero"; amount: number }
  | { op: "gain_armor"; amount: number }
  | { op: "heal"; amount: number };

export type TcgBossDef = {
  bossId: string;
  name: string;
  hp: number;
  turnScript: TcgBossTurnOp[];
};

export type TcgMinion = {
  instanceId: string;
  cardId: string;
  attack: number;
  health: number;
  keywords: string[];
  canAttack: boolean;
};

export enum TcgFightStatus {
  PLAYING = 0,
  PLAYER_WIN = 1,
  PLAYER_LOSS = 2,
}

export type TcgFightState = {
  seed: string;
  bossId: string;
  turn: number;
  heroHp: number;
  heroMaxHp: number;
  heroArmor: number;
  mana: number;
  maxMana: number;
  bossHp: number;
  bossMaxHp: number;
  bossArmor: number;
  deck: string[];
  hand: string[];
  board: TcgMinion[];
  status: TcgFightStatus;
  score: number;
  /** Total damage dealt to boss (for partial score on loss). */
  damageDealtToBoss: number;
};

export type TcgCatalog = Record<string, TcgCardDef>;

export type TcgGreedySimResult = {
  finalState: TcgFightState;
  turns: number;
  won: boolean;
};
