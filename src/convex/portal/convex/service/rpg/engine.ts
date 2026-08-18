/**
 * Portal RPG 纯引擎：钱包 / 小时指针 / join / settle / 周榜 / Pass。
 * 不按图鉴战力匹配，不按队伍缩放 Boss。
 */

import {
  RPG_DEFAULT_TABLES,
  RPG_PASS_XP,
  RpgGameType,
  RpgHallKind,
  RpgTableConfig,
  rpgLeagueScopeKey,
} from "../../../../rpg/architecture";
import { expandHourlySeed, HourlySeedPreview } from "../../../../chessArena/convex/service/seedBoss";
import { RPG_PASS_NODES, RPG_SHOP_SKUS } from "../../data/passTrack";

export const DEFAULT_RPG_ID = "default";
export const DEFAULT_TIER_ID = "gold_3";
export const DEFAULT_SCOPE = rpgLeagueScopeKey(DEFAULT_RPG_ID);

export type WalletState = {
  uid: string;
  scopeKey: `rpg:${string}`;
  coins: number;
  tickets: number;
};

export type HourlySeedRow = {
  leagueScopeKey: `rpg:${string}`;
  tierId: string;
  gameType: RpgGameType;
  hourKey: string;
  seedId: string;
};

export type RpgRun = {
  gameId: string;
  matchId: string;
  uid: string;
  tableId: string;
  hallKind: RpgHallKind;
  gameType: RpgGameType;
  seedId: string;
  hourKey: string;
  loadout: string[];
  status: "joined" | "scored" | "settled";
  score: number;
  weekKey: string;
};

export type WeeklyRow = {
  uid: string;
  scopeKey: string;
  weekKey: string;
  hourKey: string;
  points: number;
};

export type PassState = {
  uid: string;
  scopeKey: string;
  xp: number;
  claimed: number[];
};

export type RpgEngineStore = {
  wallets: Map<string, WalletState>;
  seeds: Map<string, HourlySeedRow>;
  runs: Map<string, RpgRun>;
  weekly: Map<string, WeeklyRow>;
  pass: Map<string, PassState>;
  dustGrants: Array<{ uid: string; arenaId: "chessArena"; amount: number; gameId: string }>;
};

export function createRpgStore(): RpgEngineStore {
  return {
    wallets: new Map(),
    seeds: new Map(),
    runs: new Map(),
    weekly: new Map(),
    pass: new Map(),
    dustGrants: [],
  };
}

export function hourKeyAt(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}`;
}

export function weekKeyAt(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function msUntilNextHour(date = new Date()): number {
  const next = new Date(date);
  next.setUTCMinutes(60, 0, 0);
  return next.getTime() - date.getTime();
}

function walletKey(uid: string, scopeKey = DEFAULT_SCOPE) {
  return `${uid}|${scopeKey}`;
}

function seedKey(row: Omit<HourlySeedRow, "seedId">) {
  return `${row.leagueScopeKey}|${row.tierId}|${row.gameType}|${row.hourKey}`;
}

function weeklyKey(uid: string, scopeKey: string, weekKey: string, hourKey: string) {
  return `${uid}|${scopeKey}|${weekKey}|${hourKey}`;
}

function passKey(uid: string, scopeKey = DEFAULT_SCOPE) {
  return `${uid}|${scopeKey}`;
}

function hashSeed(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `seed_${(hash >>> 0).toString(16)}`;
}

export function tableById(tableId: string): RpgTableConfig | undefined {
  return RPG_DEFAULT_TABLES.find((table) => table.id === tableId);
}

export function catalog() {
  return {
    rpgId: DEFAULT_RPG_ID,
    scopeKey: DEFAULT_SCOPE,
    halls: [
      { id: "showdown", kind: "showdown" as const, label: "秀斗馆", weekly: true },
      { id: "trial", kind: "trial" as const, label: "试炼馆", weekly: false },
    ],
    tables: RPG_DEFAULT_TABLES,
  };
}

export function ensureWallet(store: RpgEngineStore, uid: string, scopeKey = DEFAULT_SCOPE): WalletState {
  const key = walletKey(uid, scopeKey);
  const existing = store.wallets.get(key);
  if (existing) return existing;
  const wallet: WalletState = { uid, scopeKey, coins: 1200, tickets: 3 };
  store.wallets.set(key, wallet);
  return wallet;
}

export function ensurePass(store: RpgEngineStore, uid: string, scopeKey = DEFAULT_SCOPE): PassState {
  const key = passKey(uid, scopeKey);
  const existing = store.pass.get(key);
  if (existing) return existing;
  const row: PassState = { uid, scopeKey, xp: 0, claimed: [] };
  store.pass.set(key, row);
  return row;
}

export function ensureHourlySeed(
  store: RpgEngineStore,
  input: { gameType: RpgGameType; tierId?: string; hourKey?: string; scopeKey?: `rpg:${string}` },
): HourlySeedRow {
  const rowBase = {
    leagueScopeKey: input.scopeKey ?? DEFAULT_SCOPE,
    tierId: input.tierId ?? DEFAULT_TIER_ID,
    gameType: input.gameType,
    hourKey: input.hourKey ?? hourKeyAt(),
  };
  const key = seedKey(rowBase);
  const existing = store.seeds.get(key);
  if (existing) return existing;
  const seedId = hashSeed(key);
  const row: HourlySeedRow = { ...rowBase, seedId };
  store.seeds.set(key, row);
  return row;
}

export function previewTable(
  store: RpgEngineStore,
  input: { tableId: string; tierId?: string; hourKey?: string },
): {
  ok: boolean;
  reason?: string;
  table?: RpgTableConfig;
  pointer?: HourlySeedRow;
  preview?: HourlySeedPreview | { placeholder: true; gameType: "tcg" };
  remainingMs?: number;
} {
  const table = tableById(input.tableId);
  if (!table) return { ok: false, reason: "unknown_table" };
  const pointer = ensureHourlySeed(store, {
    gameType: table.gameType,
    tierId: input.tierId,
    hourKey: input.hourKey,
  });
  if (table.gameType === "tcg") {
    return {
      ok: true,
      table,
      pointer,
      preview: { placeholder: true, gameType: "tcg" },
      remainingMs: msUntilNextHour(),
    };
  }
  return {
    ok: true,
    table,
    pointer,
    preview: expandHourlySeed(pointer.seedId),
    remainingMs: msUntilNextHour(),
  };
}

export function buyTickets(
  store: RpgEngineStore,
  input: { uid: string; skuId: string },
): { ok: boolean; reason?: string; wallet?: WalletState } {
  const sku = RPG_SHOP_SKUS.find((item) => item.id === input.skuId);
  if (!sku) return { ok: false, reason: "unknown_sku" };
  const wallet = ensureWallet(store, input.uid);
  if (wallet.coins < sku.coins) return { ok: false, reason: "coins" };
  wallet.coins -= sku.coins;
  wallet.tickets += sku.tickets;
  return { ok: true, wallet: { ...wallet } };
}

export type JoinInput = {
  uid: string;
  tableId: string;
  loadout: string[];
  gameId?: string;
  tierId?: string;
  hourKey?: string;
};

export function joinRpg(store: RpgEngineStore, input: JoinInput): { ok: boolean; reason?: string; run?: RpgRun; match?: any } {
  const table = tableById(input.tableId);
  if (!table) return { ok: false, reason: "unknown_table" };
  if (table.gameType === "tcg") return { ok: false, reason: "tcg_placeholder" };
  if (!Array.isArray(input.loadout) || input.loadout.length !== 4) {
    return { ok: false, reason: "loadout" };
  }
  const wallet = ensureWallet(store, input.uid);
  if (table.hallKind === "showdown" && wallet.tickets < 1) {
    return { ok: false, reason: "ticket" };
  }
  const pointer = ensureHourlySeed(store, {
    gameType: table.gameType,
    tierId: input.tierId,
    hourKey: input.hourKey,
  });
  if (table.hallKind === "showdown") {
    wallet.tickets -= 1;
  }
  const gameId = input.gameId ?? `rpg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const run: RpgRun = {
    gameId,
    matchId: `m_${gameId}`,
    uid: input.uid,
    tableId: table.id,
    hallKind: table.hallKind,
    gameType: table.gameType,
    seedId: pointer.seedId,
    hourKey: pointer.hourKey,
    loadout: [...input.loadout],
    status: "joined",
    score: 0,
    weekKey: weekKeyAt(),
  };
  store.runs.set(gameId, run);
  return {
    ok: true,
    run,
    match: {
      gameId,
      matchId: run.matchId,
      uid: input.uid,
      seed: run.seedId,
      loadout: run.loadout,
      tableId: table.id,
      hallKind: table.hallKind,
      gameType: table.gameType,
      hourKey: run.hourKey,
      score: 0,
      status: 1,
    },
  };
}

export function submitMatchScore(store: RpgEngineStore, gameId: string, score: number) {
  const run = store.runs.get(gameId);
  if (!run) return { ok: false, reason: "missing_run" };
  run.score = score;
  run.status = "scored";
  return { ok: true, match: { gameId, seed: run.seedId, score, loadout: run.loadout, uid: run.uid } };
}

export function findMatchGame(store: RpgEngineStore, gameId: string) {
  const run = store.runs.get(gameId);
  if (!run) return null;
  return {
    gameId: run.gameId,
    matchId: run.matchId,
    uid: run.uid,
    seed: run.seedId,
    loadout: run.loadout,
    tableId: run.tableId,
    hallKind: run.hallKind,
    gameType: run.gameType,
    hourKey: run.hourKey,
    score: run.score,
    status: run.status === "joined" ? 1 : 2,
  };
}

export type SettleResult = {
  ok: boolean;
  reason?: string;
  coins?: number;
  passXp?: number;
  weeklyDelta?: number;
  weeklyPoints?: number;
  dust?: number;
  wallet?: WalletState;
  run?: RpgRun;
};

export function settleRpg(store: RpgEngineStore, input: { gameId: string; score: number; success?: boolean }): SettleResult {
  const run = store.runs.get(input.gameId);
  if (!run) return { ok: false, reason: "missing_run" };
  if (run.status === "settled") {
    return { ok: true, coins: 0, passXp: 0, weeklyDelta: 0, dust: 0, run, wallet: ensureWallet(store, run.uid) };
  }
  run.score = input.score;
  const coins = Math.max(10, Math.floor(input.score / 20));
  const dust = Math.max(0, Math.floor(input.score / 50));
  const success = input.success ?? input.score > 0;
  let passXp = 0;
  if (run.hallKind === "showdown") {
    passXp = RPG_PASS_XP.showdownComplete;
  } else if (success) {
    passXp = RPG_PASS_XP.trialSuccess;
  }
  const wallet = ensureWallet(store, run.uid);
  wallet.coins += coins;
  const pass = ensurePass(store, run.uid);
  pass.xp += passXp;

  let weeklyDelta = 0;
  let weeklyPoints = 0;
  if (run.hallKind === "showdown") {
    const key = weeklyKey(run.uid, DEFAULT_SCOPE, run.weekKey, run.hourKey);
    const existing = store.weekly.get(key);
    const prev = existing?.points ?? 0;
    const next = Math.max(prev, input.score);
    weeklyDelta = next - prev;
    weeklyPoints = next;
    store.weekly.set(key, {
      uid: run.uid,
      scopeKey: DEFAULT_SCOPE,
      weekKey: run.weekKey,
      hourKey: run.hourKey,
      points: next,
    });
  }

  if (dust > 0 && run.gameType === "chess") {
    store.dustGrants.push({ uid: run.uid, arenaId: "chessArena", amount: dust, gameId: run.gameId });
  }
  run.status = "settled";
  return {
    ok: true,
    coins,
    passXp,
    weeklyDelta,
    weeklyPoints,
    dust,
    wallet: { ...wallet },
    run,
  };
}

export function weekTotal(store: RpgEngineStore, uid: string, weekKey = weekKeyAt()): number {
  let total = 0;
  for (const row of store.weekly.values()) {
    if (row.uid === uid && row.weekKey === weekKey) total += row.points;
  }
  return total;
}

export function leagueBoard(store: RpgEngineStore, weekKey = weekKeyAt()) {
  const totals = new Map<string, number>();
  for (const row of store.weekly.values()) {
    if (row.weekKey !== weekKey) continue;
    totals.set(row.uid, (totals.get(row.uid) ?? 0) + row.points);
  }
  return [...totals.entries()]
    .map(([uid, points]) => ({ uid, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 30);
}

export function claimPass(store: RpgEngineStore, uid: string): { ok: boolean; claimed: number[]; wallet: WalletState; xp: number } {
  const pass = ensurePass(store, uid);
  const wallet = ensureWallet(store, uid);
  const newly: number[] = [];
  for (const node of RPG_PASS_NODES) {
    if (pass.xp < node.xp || pass.claimed.includes(node.node)) continue;
    pass.claimed.push(node.node);
    newly.push(node.node);
    if (node.kind === "coin") wallet.coins += node.amount;
    if (node.kind === "ticket") wallet.tickets += node.amount;
  }
  return { ok: true, claimed: newly, wallet: { ...wallet }, xp: pass.xp };
}

export function hudSnapshot(store: RpgEngineStore, uid: string) {
  const wallet = ensureWallet(store, uid);
  const pass = ensurePass(store, uid);
  return {
    tier: DEFAULT_TIER_ID,
    coins: wallet.coins,
    tickets: wallet.tickets,
    weekPoints: weekTotal(store, uid),
    passXp: pass.xp,
    claimed: [...pass.claimed],
    remainingMs: msUntilNextHour(),
  };
}

export { RPG_PASS_NODES, RPG_SHOP_SKUS };
