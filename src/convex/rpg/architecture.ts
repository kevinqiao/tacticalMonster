/**
 * RPG 系统架构 SSOT（实现前契约）
 *
 * 一句话：Portal 管赛区 / 馆 / 桌 / 小时题 / 结算 / Pass；
 * 棋的卡和战斗在 chessArena，牌的卡和战斗在 tcgArena。
 * 馆按单人挑战 / 多人竞技分，不按玩法分。
 *
 * ---------------------------------------------------------------------------
 * 分层
 *   L0 Platform   SSO、钱包 scopeKey、门票
 *   L1 Portal RPG Trial/Showdown 馆、桌 catalog、小时 seed 指针、
 *                 League(rpg:)、Battle Pass、join/settle
 *   L2 Arena      chessArena | tcgArena | solitaireArena
 *                 各自拥有：卡/英雄定义、玩家图鉴、负荷冻结、对局、回放
 *   L3 前端       /rpg（对标 /town）；卡册 UI 读对应 Arena
 *
 * ---------------------------------------------------------------------------
 * League：只有 lobby | town | rpg（不要 game:、不要 arena:）
 *   lobby:{id}  合作方大厅
 *   town:{id}   Mayfield；桌上挂 solitaireArena 等
 *   rpg:{id}    RPG 秀斗周榜；桌上挂 chess / tcg
 * Arena 是引擎不是赛区。solitaireArena / chessArena / tcgArena 对等。
 *
 * ---------------------------------------------------------------------------
 * 馆与桌（对标 parlor / saloon）
 *   rpg:default
 *     Trial     不计周分    桌 chess → chessArena  桌 tcg → tcgArena
 *     Showdown  计入周分    同上（chess+tcg 共用 weeklyPoints）
 *
 * ---------------------------------------------------------------------------
 * 小时同题
 *   Portal 存 scope × 段位 × gameType × hourKey → seedId
 *   进场前向该 Arena 拉 Boss/地图预览；进场锁 seed 进 run
 *   不按战力开桌；不按个人图鉴缩放 Boss
 *   基础阵容由各 Arena 段位路发放，必须能通关拿分
 *
 * ---------------------------------------------------------------------------
 * 进场
 *   选馆 → 选桌 → 预览 → Arena 组 4 英雄或卡组 → Portal.join
 *   → Arena.freeze + start → submitScore → Portal.settle
 *   发卡/尘只发生在对应 Arena；Pass 只产 coins/tickets
 *
 * ---------------------------------------------------------------------------
 * 经济（钱包 scopeKey = rpg:{rpgId}）
 *   Pass 与 Town Term Pass 同构：秀斗 +10 XP / 试炼成功 +4，节点发币和票
 *   尘在各 Arena 内定向合成；开包为 M2 可选，非 v1
 *
 * ---------------------------------------------------------------------------
 * 硬边界
 *   Town Zone 不产 RPG 卡；TM teamPower 缩 Boss 不用于 RPG 同桌
 *   chess 与 tcg 不拆成两座玩法馆；两套卡表不共用战斗数值
 */

export const RPG_LEAGUE_SCOPE_KINDS = ["lobby", "town", "rpg"] as const;
export type RpgLeagueScopeKind = (typeof RPG_LEAGUE_SCOPE_KINDS)[number];

export const RPG_ARENA_IDS = ["solitaireArena", "chessArena", "tcgArena"] as const;
export type RpgArenaId = (typeof RPG_ARENA_IDS)[number];

export const RPG_HALL_KINDS = ["trial", "showdown"] as const;
export type RpgHallKind = (typeof RPG_HALL_KINDS)[number];

export const RPG_GAME_TYPES = ["chess", "tcg"] as const;
export type RpgGameType = (typeof RPG_GAME_TYPES)[number];

export function rpgLeagueScopeKey(rpgId: string): `rpg:${string}` {
  return `rpg:${rpgId}`;
}

export function isRpgLeagueScopeKey(key: string | null | undefined): boolean {
  return Boolean(key && key.startsWith("rpg:"));
}

export type RpgTableConfig = {
  id: string;
  hallKind: RpgHallKind;
  gameType: RpgGameType;
  arenaId: Extract<RpgArenaId, "chessArena" | "tcgArena">;
  tournamentId: string;
  buyIn?: number;
};

/** RPG 默认两馆四桌，对标 Town parlor/saloon × solitaire/yatz。 */
export const RPG_DEFAULT_TABLES: RpgTableConfig[] = [
  {
    id: "trial_chess",
    hallKind: "trial",
    gameType: "chess",
    arenaId: "chessArena",
    tournamentId: "rpg_solo_chess",
  },
  {
    id: "trial_tcg",
    hallKind: "trial",
    gameType: "tcg",
    arenaId: "tcgArena",
    tournamentId: "rpg_solo_tcg",
  },
  {
    id: "showdown_chess",
    hallKind: "showdown",
    gameType: "chess",
    arenaId: "chessArena",
    tournamentId: "rpg_multi_chess",
  },
  {
    id: "showdown_tcg",
    hallKind: "showdown",
    gameType: "tcg",
    arenaId: "tcgArena",
    tournamentId: "rpg_multi_tcg",
  },
];

export function arenaIdForGameType(gameType: RpgGameType): RpgTableConfig["arenaId"] {
  return gameType === "chess" ? "chessArena" : "tcgArena";
}

/** Portal 小时题指针；内容展开在对应 Arena。 */
export type RpgHourlySeedPointer = {
  leagueScopeKey: `rpg:${string}`;
  tierId: string;
  gameType: RpgGameType;
  hourKey: string;
  seedId: string;
};

export const RPG_PASS_XP = {
  showdownComplete: 10,
  trialSuccess: 4,
} as const;
