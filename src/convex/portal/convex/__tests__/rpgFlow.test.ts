import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGameState, defaultRankRoadLoadout, scoreFinishedGame } from "../../../chessArena/convex/service/createGame";
import { RPG_PASS_XP } from "../../../rpg/architecture";
import {
  buyTickets,
  catalog,
  claimPass,
  createRpgStore,
  hudSnapshot,
  joinRpg,
  leagueBoard,
  previewTable,
} from "../service/rpg/engine";
import { playJoinSettle, createArenaMemory, ensureChessPlayer } from "../../../rpg/session";

describe("portal rpg catalog and hourly pointer", () => {
  it("exposes two halls and four tables without power matching", () => {
    const cat = catalog();
    assert.equal(cat.scopeKey, "rpg:default");
    assert.deepEqual(cat.halls.map((h) => h.kind), ["showdown", "trial"]);
    assert.deepEqual(cat.tables.map((t) => t.id), [
      "trial_chess",
      "trial_tcg",
      "showdown_chess",
      "showdown_tcg",
    ]);
  });

  it("locks the same seed for the same hour pointer", () => {
    const store = createRpgStore();
    const a = previewTable(store, { tableId: "showdown_chess", hourKey: "2026-08-18T04" });
    const b = previewTable(store, { tableId: "showdown_chess", hourKey: "2026-08-18T04" });
    assert.equal(a.ok, true);
    assert.equal(a.pointer?.seedId, b.pointer?.seedId);
    const hpA = a.preview && "boss" in a.preview ? a.preview.boss.hp : undefined;
    const hpB = b.preview && "boss" in b.preview ? b.preview.boss.hp : undefined;
    assert.equal(hpA, hpB);
  });

  it("tcg preview is a placeholder", () => {
    const store = createRpgStore();
    const preview = previewTable(store, { tableId: "showdown_tcg" });
    assert.equal(preview.ok, true);
    assert.equal(Boolean(preview.preview && "placeholder" in preview.preview), true);
  });
});

describe("join → chess game → settle", () => {
  it("rejects tcg tables and does not match on teamPower", () => {
    const store = createRpgStore();
    const tcg = joinRpg(store, { uid: "u1", tableId: "trial_tcg", loadout: defaultRankRoadLoadout() });
    assert.equal(tcg.ok, false);
    const joined = joinRpg(store, { uid: "u1", tableId: "showdown_chess", loadout: defaultRankRoadLoadout() });
    assert.equal(joined.ok, true);
    assert.ok(joined.run?.seedId);
  });

  it("showdown writes weekly max per hour and Pass XP 10", () => {
    const store = createRpgStore();
    const arena = createArenaMemory();
    const first = playJoinSettle({
      store,
      arena,
      uid: "ace",
      tableId: "showdown_chess",
      loadout: defaultRankRoadLoadout(),
      gameId: "g-hour-1",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.settled.passXp, RPG_PASS_XP.showdownComplete);
    const firstWeekly = first.settled.weeklyPoints ?? 0;
    const second = playJoinSettle({
      store,
      arena,
      uid: "ace",
      tableId: "showdown_chess",
      loadout: ["hero_mage", "hero_warden", "hero_assassin", "hero_tank"],
      gameId: "g-hour-1b",
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.game.boss.stats.hp.max, first.game.boss.stats.hp.max);
    const board = leagueBoard(store);
    const me = board.find((row) => row.uid === "ace");
    assert.equal(me?.points, Math.max(firstWeekly, second.settled.weeklyPoints ?? 0));
    assert.ok((arena.dust.get("ace") ?? 0) > 0);
  });

  it("trial does not write weekly points and grants Pass XP 4 on success", () => {
    const store = createRpgStore();
    const arena = createArenaMemory();
    const result = playJoinSettle({
      store,
      arena,
      uid: "solo",
      tableId: "trial_chess",
      loadout: defaultRankRoadLoadout(),
      gameId: "trial-1",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.settled.passXp, RPG_PASS_XP.trialSuccess);
    assert.equal(result.settled.weeklyDelta, 0);
    assert.deepEqual(leagueBoard(store), []);
  });

  it("shop spends coins on tickets and pass claims coins/tickets", () => {
    const store = createRpgStore();
    const hud0 = hudSnapshot(store, "shopper");
    const bought = buyTickets(store, { uid: "shopper", skuId: "ticket_x1" });
    assert.equal(bought.ok, true);
    assert.equal(bought.wallet?.tickets, hud0.tickets + 1);
    const pass = store.pass.get("shopper|rpg:default") ?? { uid: "shopper", scopeKey: "rpg:default", xp: 0, claimed: [] };
    pass.xp = 200;
    store.pass.set("shopper|rpg:default", pass);
    const claimed = claimPass(store, "shopper");
    assert.ok(claimed.claimed.length > 0);
    assert.ok(claimed.wallet.coins > (bought.wallet?.coins ?? 0));
  });
});

describe("chessArena ownership", () => {
  it("rank-road grants a playable 4 and catalog reads ownership", () => {
    const arena = createArenaMemory();
    const owned = ensureChessPlayer(arena, "codex");
    assert.equal(owned.length, 4);
    const store = createRpgStore();
    const game = createGameState({
      gameId: "own-1",
      seed: previewTable(store, { tableId: "trial_chess", hourKey: "2026-08-18T04" }).pointer!.seedId,
      loadout: owned.map((row) => row.heroId),
      uid: "codex",
    });
    assert.ok(scoreFinishedGame(game) > 0);
    assert.equal(game.team.length, 4);
  });
});
