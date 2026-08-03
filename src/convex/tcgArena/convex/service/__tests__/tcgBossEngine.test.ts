import { describe, expect, it } from "vitest";
import { runGreedyBossFight, buildCatalog } from "../TcgBossEngine";
import type { TcgBossDef, TcgCardDef } from "../../types/TcgTypes";

const CARDS: TcgCardDef[] = [
  {
    cardId: "s1_strike_1",
    name: "Strike",
    cost: 1,
    type: "spell",
    effectId: "deal_damage",
    params: { amount: 2, target: "boss" },
    rarity: "common",
    faction: "fire",
  },
  {
    cardId: "s1_strike_2",
    name: "Heavy Strike",
    cost: 2,
    type: "spell",
    effectId: "deal_damage",
    params: { amount: 3, target: "boss" },
    rarity: "common",
    faction: "fire",
  },
  {
    cardId: "s1_bolt_3",
    name: "Flame Bolt",
    cost: 3,
    type: "spell",
    effectId: "deal_damage",
    params: { amount: 5, target: "boss" },
    rarity: "rare",
    faction: "fire",
  },
  {
    cardId: "s1_guard_2",
    name: "Ember Shield",
    cost: 2,
    type: "spell",
    effectId: "gain_armor",
    params: { amount: 3 },
    rarity: "common",
    faction: "fire",
  },
  {
    cardId: "s1_flame_imp_1",
    name: "Flame Imp",
    cost: 1,
    type: "minion",
    attack: 2,
    health: 1,
    keywords: [],
    rarity: "common",
    faction: "fire",
  },
  {
    cardId: "s1_soldier_2",
    name: "Ash Guard",
    cost: 2,
    type: "minion",
    attack: 2,
    health: 3,
    keywords: ["taunt"],
    rarity: "common",
    faction: "fire",
  },
];

const BOSS: TcgBossDef = {
  bossId: "boss_01",
  name: "Ice Golem",
  hp: 35,
  turnScript: [
    { op: "deal_damage_hero", amount: 3 },
    { op: "deal_damage_hero", amount: 4 },
    { op: "gain_armor", amount: 4 },
    { op: "deal_damage_hero", amount: 5 },
    { op: "deal_damage_hero", amount: 3 },
  ],
};

const DECK = [
  "s1_strike_1",
  "s1_strike_1",
  "s1_strike_2",
  "s1_flame_imp_1",
  "s1_flame_imp_1",
  "s1_guard_2",
  "s1_bolt_3",
  "s1_soldier_2",
];

describe("TcgBossEngine", () => {
  it("produces deterministic score for fixed seed", () => {
    const catalog = buildCatalog(CARDS);
    const a = runGreedyBossFight({
      seed: "tcg-sim-test-001",
      boss: BOSS,
      deckCardIds: DECK,
      catalog,
    });
    const b = runGreedyBossFight({
      seed: "tcg-sim-test-001",
      boss: BOSS,
      deckCardIds: DECK,
      catalog,
    });
    expect(a.finalState.score).toBe(b.finalState.score);
    expect(a.won).toBe(b.won);
    expect(a.turns).toBe(b.turns);
  });

  it("returns positive score on win or partial damage on loss", () => {
    const catalog = buildCatalog(CARDS);
    const result = runGreedyBossFight({
      seed: "tcg-sim-test-001",
      boss: BOSS,
      deckCardIds: DECK,
      catalog,
    });
    expect(result.finalState.score).toBeGreaterThan(0);
    if (result.won) {
      expect(result.finalState.score).toBeGreaterThanOrEqual(1000);
    } else {
      expect(result.finalState.damageDealtToBoss).toBeGreaterThan(0);
    }
  });

  it("different seeds can yield different outcomes", () => {
    const catalog = buildCatalog(CARDS);
    const r1 = runGreedyBossFight({
      seed: "seed-alpha",
      boss: BOSS,
      deckCardIds: DECK,
      catalog,
    });
    const r2 = runGreedyBossFight({
      seed: "seed-beta",
      boss: BOSS,
      deckCardIds: DECK,
      catalog,
    });
    const sameOutcome =
      r1.won === r2.won &&
      r1.finalState.score === r2.finalState.score &&
      r1.turns === r2.turns;
    expect(sameOutcome).toBe(false);
  });
});
