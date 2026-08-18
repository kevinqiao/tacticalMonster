import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGameState, defaultRankRoadLoadout } from "../service/createGame";
import { expandHourlySeed } from "../service/seedBoss";

describe("chessArena fixed Boss", () => {
  it("same seed produces identical Boss HP", () => {
    const a = expandHourlySeed("seed_same_hour");
    const b = expandHourlySeed("seed_same_hour");
    assert.equal(a.boss.hp, b.boss.hp);
    assert.equal(a.boss.bossId, b.boss.bossId);
    assert.equal(a.map.mapId, b.map.mapId);
  });

  it("createGame does not scale Boss by loadout / teamPower", () => {
    const seed = "seed_hour_gold3_chess";
    const road = defaultRankRoadLoadout();
    const alt = ["hero_mage", "hero_warden", "hero_assassin", "hero_tank"];
    const g1 = createGameState({ gameId: "g1", seed, loadout: road, uid: "u1" });
    const g2 = createGameState({ gameId: "g2", seed, loadout: alt, uid: "u2" });
    assert.equal(g1.boss.stats.hp.max, g2.boss.stats.hp.max);
    assert.equal(g1.boss.stats.attack, g2.boss.stats.attack);
    assert.equal(g1.boss.hp, g2.boss.hp);
    assert.notEqual(g1.teamPower, g2.teamPower);
    assert.notDeepEqual(g1.loadout, g2.loadout);
  });

  it("does not expose a teamPower argument on seed expand", () => {
    assert.equal(expandHourlySeed.length, 1);
  });
});
