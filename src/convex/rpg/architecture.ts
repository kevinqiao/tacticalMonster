/**
 * RPG 系统架构 SSOT（实现前契约）
 *
 * 叙述文档（已定稿）：docs/rpg/architecture.md（源 ./architectureDoc.ts）
 * UI 线框（已定稿）：docs/rpg/ui-wireframe.md（源 ./uiWireframe.ts）
 * 类型与常量以此文件为准；两份冲突时改叙述，不改已拍板的类型语义。
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
 *   5 me       /rpg/me       图鉴。页内库导航按游戏切（TCG / 战棋 / 未来桌），不是新底栏
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

/**
 * 新游戏接入（桌上 + 图鉴）。不要加第 6 个底栏，不要在对战首页加玩法馆大门。
 * 1. 本数组追加 gameType
 * 2. 新 Arena（与 solitaireArena 对等，自带目录/尘/战斗）
 * 3. RPG_DEFAULT_TABLES：试炼、秀斗各加一桌
 * 4. RPG_CODEX.libraries 加一条 → 图鉴库导航自动多一枚 chip
 */

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
 *   5 me       图鉴   页内库导航切游戏；默认 TCG
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
  "roster: 图鉴。页内库导航切游戏（默认 TCG）。网格只显示当前 Arena。英雄/新游戏都是同一套卡册壳",
] as const;

/**
 * 图鉴（/rpg/me）。
 *
 * 有导航，但是页内「库导航」，不是壳上的第 6 栏，也不是对战里的玩法馆。
 * 对战：馆 → 桌(gameType)。图鉴：库(gameType) → 筛选 → 卡。同一批游戏，父级不同。
 * 一屏只展示一座 Arena。新游戏往 libraries 加一行，chip 自动出现。
 */
export type RpgCodexLibrary = {
  gameType: RpgGameType;
  arenaId: Extract<RpgArenaId, "chessArena" | "tcgArena">;
  navLabel: string;
  atom: "card" | "hero_card";
  playableCap: number;
  filterSchema: "card" | "hero";
  isDefault?: boolean;
};

export const RPG_CODEX_LIBRARIES: readonly RpgCodexLibrary[] = [
  {
    gameType: "tcg",
    arenaId: "tcgArena",
    navLabel: "TCG",
    atom: "card",
    playableCap: 2,
    filterSchema: "card",
    isDefault: true,
  },
  {
    gameType: "chess",
    arenaId: "chessArena",
    navLabel: "战棋",
    atom: "hero_card",
    playableCap: 1,
    filterSchema: "hero",
  },
];

export const RPG_CODEX = {
  tabId: "me",
  path: "/rpg/me",
  label: "图鉴",
  defaultGameType: "tcg" as RpgGameType,
  libraries: RPG_CODEX_LIBRARIES,
} as const;

export function rpgCodexLibraryForGame(
  gameType: RpgGameType,
): RpgCodexLibrary | undefined {
  return RPG_CODEX_LIBRARIES.find((library) => library.gameType === gameType);
}

export const RPG_CODEX_DEFAULT_LIBRARY =
  RPG_CODEX_LIBRARIES.find((library) => library.isDefault) ?? RPG_CODEX_LIBRARIES[0];

/**
 * 图鉴导航。
 *
 * L0 壳五栏（无游戏）
 * L1 库导航：一枚 chip = 一个 gameType / Arena（可横滑）
 * L2 该库自己的筛选
 * L3 网格 → 详情 / 合成
 */
export const RPG_CODEX_NAV = {
  kind: "inPageLibraryChips",
  route: "/rpg/me/:gameType",
  detailRoute: "/rpg/me/:gameType/:cardId",
  persist: "lastGameType",
  syncFromBattle: false,
  hideWhenLibraryCount: 1,
  overflow: "horizontalScroll",
  chipShows: ["navLabel", "ownedTotal"],
  not: ["shellTab", "gameHall", "mixedGrid", "sixthTab"],
} as const;

export const RPG_CODEX_SCREENS = ["album", "detail", "craft"] as const;
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
  gameType: RpgGameType;
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
 * 卡册 /rpg/me/:gameType
 *   HUD：段位 · coin · ticket · 当前库尘
 *   库导航：TCG | 战棋 | …（横滑；新游戏加 chip）
 *   进度与尘随当前库变
 *   筛选 schema 随当前库变（TCG：费用/类型/稀有；战棋：定位/稀有）
 *   网格只含当前 Arena
 *
 * 详情 /rpg/me/:gameType/:cardId
 *   大卡面、规则、张数、合成/分解。不组队、不开包。
 *
 * 合成确认：扣当前 Arena 尘。
 *
 * 战棋不是独立页，只是 gameType=chess。新游戏同理：新 chip。
 *
 * 卡面状态：owned | missing | extra | locked_rank | new
 * 数据：目录与所有权读对应 Arena；Portal 只提供壳、钱包、段位。
 */
export const RPG_CODEX_UI = {
  albumPath: "/rpg/me/:gameType",
  detailPath: "/rpg/me/:gameType/:cardId",
  gridColumns: 3,
  hud: ["tier", "coins", "tickets", "arenaDust"],
  libraryNav: "chips",
  forbidden: [
    "collectionPower",
    "loadoutEdit",
    "packOpen",
    "crossArenaCraft",
    "teamTab",
    "shellGameTab",
    "mixedLibraryGrid",
  ],
} as const;

export const RPG_CODEX_RULES = [
  "有导航：图鉴页内库 chip，一枚 = 一个 gameType。不要加壳 Tab",
  "默认 TCG；记住 lastGameType。不强制跟对战当前桌同步",
  "网格只渲染当前库。禁止把 chess/tcg/新游戏混在一张网里",
  "卡牌所有权、张数、尘、合成只发生在所属 Arena",
  "artId 可共享；cost/type/rarity/combat stats 不可跨 Arena 抄",
  "rank_road 基础卡已有且不可分解；必须够打本段小时题",
  "张数上限由该库 playableCap 决定；多余才可分解",
  "图鉴不改小时题、不改 Boss、不产生周分",
  "结算发的尘/卡带 arenaId；深链到 /rpg/me/:gameType/:cardId",
  "v1 无开包入口；商店不卖卡",
  "新游戏：gameType + Arena + 两馆各一桌 + libraries 一行",
] as const;
