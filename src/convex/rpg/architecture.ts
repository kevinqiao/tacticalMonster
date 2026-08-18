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
 *   L3 前端       /rpg 壳对标 /town 五栏：shop · rewards · battle · league · me
 *                 卡册 UI 读对应 Arena
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
 * 壳（对标 Town 五栏，顺序固定，battle 居中）
 *   1 shop     /rpg/shop     花 rpg 钱包 coin 买票；v1 不开包、不卖 Arena 卡
 *   2 rewards  /rpg/rewards  Term Pass 领取（coins / tickets）
 *   3 battle   /rpg          试炼 / 秀斗馆 → chess / tcg 桌 → 小时题
 *   4 league   /rpg/league   rpg: 周榜
 *   5 me       /rpg/me       图鉴。主业是卡牌收集（默认 tcgArena）；英雄是次级库，不是战队
 *
 * ---------------------------------------------------------------------------
 * 硬边界
 *   Town Zone 不产 RPG 卡；TM teamPower 缩 Boss 不用于 RPG 同桌
 *   chess 与 tcg 不拆成两座玩法馆；两套卡表不共用战斗数值
 *   不要自造四栏壳；Pass 不是独立 Tab，并进 rewards；馆并进 battle
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

/**
 * 前端路由与壳，对标 /town 五栏（顺序固定，battle 居中为默认落地）：
 *   1 shop     商店   花 coin（票；开包为 M2，不卖 Arena 卡）
 *   2 rewards  奖励   Term Pass 领取（coins / tickets），不是拆包
 *   3 battle   对战   试炼 / 秀斗馆 → chess / tcg 桌 → 小时题
 *   4 league   联赛   rpg: 周榜
 *   5 me       图鉴   卡牌收集主页；槽位仍是 Town 的 me
 */
export const RPG_ROUTE = "/rpg" as const;

export const RPG_SHELL_TABS = [
  { id: "shop", path: "/rpg/shop", label: "商店" },
  { id: "rewards", path: "/rpg/rewards", label: "奖励" },
  { id: "battle", path: "/rpg", label: "对战" },
  { id: "league", path: "/rpg/league", label: "联赛" },
  { id: "me", path: "/rpg/me", label: "图鉴" },
] as const;

export type RpgShellTabId = (typeof RPG_SHELL_TABS)[number]["id"];

export type RpgUiScreenId =
  | "shop"
  | "rewards"
  | "home"
  | "hall"
  | "preview"
  | "loadout"
  | "match"
  | "result"
  | "league"
  | "roster";

export const RPG_UI_FLOW = [
  "shop: 花 rpg 钱包 coin 买票；v1 不开包、不卖 chess/tcg 卡",
  "rewards: Term Pass 节点领取 coin / ticket（秀斗 +10 XP / 试炼成功 +4）",
  "home: battle 落地。两馆入口（试炼 / 秀斗），不是 chess/tcg 两座玩法馆",
  "hall: 馆内两桌（chess / tcg）+ 小时题摘要",
  "preview: Boss、地图、倒计时；评估后再组队",
  "loadout: chess 4 英雄 | tcg 卡组（读对应 Arena）",
  "match: 全屏对局，无底栏",
  "result: 分数、名次、coin、Pass XP、尘",
  "league: 同段位 Pod，chess/tcg 秀斗共榜",
  "roster: 图鉴默认 tcgArena 卡册（收集/筛选/详情/合成）。英雄是次级库。不要叫战队",
] as const;

/**
 * 图鉴（/rpg/me）完整契约。
 *
 * 主业是卡牌收集，不是个人主页、不是战队、不是组队。
 * 落地就是 tcgArena 卡册。chessArena 英雄是次级库：同一套卡面 UI，更薄。
 * 两套目录永不混表；尘按 Arena 分桶；战斗数值只读所属 Arena。
 */
export const RPG_CODEX = {
  tabId: "me",
  path: "/rpg/me",
  label: "图鉴",
  defaultLibrary: "tcgArena",
  libraries: [
    {
      id: "cards",
      arenaId: "tcgArena",
      label: "卡牌",
      role: "primary",
      atom: "card",
      playableCap: 2,
    },
    {
      id: "heroes",
      arenaId: "chessArena",
      label: "英雄",
      role: "secondary",
      atom: "hero_card",
      playableCap: 1,
    },
  ],
} as const;

export type RpgCodexLibraryId = (typeof RPG_CODEX.libraries)[number]["id"];

export const RPG_CODEX_SCREENS = [
  "album",
  "detail",
  "craft",
  "heroes",
] as const;
export type RpgCodexScreenId = (typeof RPG_CODEX_SCREENS)[number];

export const RPG_CODEX_OWNED_FILTERS = ["all", "owned", "missing"] as const;
export type RpgCodexOwnedFilter = (typeof RPG_CODEX_OWNED_FILTERS)[number];

export const RPG_CODEX_CARD_TYPES = ["minion", "spell", "weapon"] as const;
export type RpgCodexCardType = (typeof RPG_CODEX_CARD_TYPES)[number];

export const RPG_CODEX_RARITIES = ["common", "rare", "epic", "legendary"] as const;
export type RpgCodexRarity = (typeof RPG_CODEX_RARITIES)[number];

export const RPG_CODEX_SORTS = ["cost", "rarity", "name", "recent"] as const;
export type RpgCodexSort = (typeof RPG_CODEX_SORTS)[number];

export const RPG_CODEX_CARD_SOURCES = [
  "rank_road",
  "craft",
  "match_drop",
  "pass_paid",
] as const;
export type RpgCodexCardSource = (typeof RPG_CODEX_CARD_SOURCES)[number];

/** tcgArena 合成/分解（单位：该 Arena 尘）。传说不可分解基础路。 */
export const RPG_CODEX_DUST = {
  common: { craft: 40, disenchant: 5 },
  rare: { craft: 100, disenchant: 20 },
  epic: { craft: 400, disenchant: 100 },
  legendary: { craft: 1600, disenchant: 400 },
} as const;

export type RpgCodexCard = {
  arenaId: Extract<RpgArenaId, "chessArena" | "tcgArena">;
  cardId: string;
  /** 美术可跨 Arena 复用；数值与所有权不可。 */
  artId?: string;
  name: string;
  cost: number;
  type: RpgCodexCardType | "hero";
  rarity: RpgCodexRarity;
  ownedCopies: number;
  playableCap: number;
  source: RpgCodexCardSource;
  newUntilSeen: boolean;
};

export type RpgCodexAlbumQuery = {
  arenaId: Extract<RpgArenaId, "chessArena" | "tcgArena">;
  owned: RpgCodexOwnedFilter;
  types: RpgCodexCardType[] | "all";
  rarities: RpgCodexRarity[] | "all";
  cost: number | "all";
  sort: RpgCodexSort;
  search?: string;
};

/**
 * 图鉴页信息架构（实现按此排）。
 *
 * 卡册 /rpg/me
 *   HUD：段位 · coin · ticket · 当前 Arena 尘（没有图鉴战力）
 *   库切换：卡牌(默认) | 英雄(次级)
 *   进度：已收集 a/b · 尘 n
 *   筛选：全部 / 已有 / 未有；费用；类型；稀有度；排序
 *   网格：3 列卡面。已有显示张数；未有剪影 + 合成价；新卡角标
 *   点卡 → 详情
 *
 * 详情 /rpg/me/:cardId
 *   大卡面、费用、类型、稀有、规则、所属 Arena
 *   张数 owned/playableCap
 *   主按钮：合成（尘够）或分解（多余且非 rank_road）
 *   不在这里组队、不进商店开包
 *
 * 合成确认
 *   扣该 Arena 尘。tcg 尘不能合成 chess 卡。
 *
 * 英雄库（次级）
 *   同一卡面 UI，目录更薄。段位路解锁 = 已有。v1 可不做英雄分解。
 *   4 人出战仍在 battle loadout。
 *
 * 卡面状态：owned | missing | extra | locked_rank | new
 * 数据：目录与所有权读对应 Arena；Portal 只提供壳、钱包、段位。
 */
export const RPG_CODEX_UI = {
  albumPath: "/rpg/me",
  detailPath: "/rpg/me/:cardId",
  gridColumns: 3,
  hud: ["tier", "coins", "tickets", "arenaDust"],
  forbidden: [
    "collectionPower",
    "loadoutEdit",
    "packOpen",
    "crossArenaCraft",
    "teamTab",
  ],
} as const;

export const RPG_CODEX_RULES = [
  "默认库 tcgArena；英雄库不得做成落地页或对等第二本",
  "卡牌所有权、张数、尘、合成只发生在所属 Arena",
  "artId 可共享；cost/type/rarity/combat stats 不可跨 Arena 抄",
  "rank_road 基础卡已有且不可分解；必须够打本段小时题",
  "张数上限 tcg=2、英雄=1；多余才可分解",
  "图鉴不改小时题、不改 Boss、不产生周分",
  "结算发的尘/卡带 arenaId；图鉴用新角标直到点进详情",
  "v1 无开包入口；商店不卖卡",
] as const;
