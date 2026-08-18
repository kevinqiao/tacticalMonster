/**
 * RPG 架构设计文档（已定稿）
 *
 * 将 Town 壳、Portal 赛区、Arena 引擎、小时同题、图鉴收集的讨论收口为此文。
 * 类型与可编译常量的 SSOT 是 ./architecture.ts。本文只叙述，不另发明枚举。
 *
 * 状态：accepted
 * 日期：2026-08-18
 */
import {
  RPG_CODEX,
  RPG_CODEX_DUST,
  RPG_CODEX_NAV,
  RPG_DEFAULT_TABLES,
  RPG_GAME_TYPES,
  RPG_HALL_KINDS,
  RPG_LEAGUE_SCOPE_KINDS,
  RPG_PASS_XP,
  RPG_ROUTE,
  RPG_SHELL_TABS,
} from "./architecture";

export const RPG_ARCHITECTURE_DOC_STATUS = {
  status: "accepted",
  date: "2026-08-18",
  ssot: "src/convex/rpg/architecture.ts",
  product: "Portal RPG",
} as const;

/**
 * 已定稿全文。实现、评审、开新游戏时先读此文，再改 architecture.ts。
 */
export const RPG_ARCHITECTURE_DOCUMENT = `
# Portal RPG 架构设计

状态：${RPG_ARCHITECTURE_DOC_STATUS.status}　日期：${RPG_ARCHITECTURE_DOC_STATUS.date}
SSOT：${RPG_ARCHITECTURE_DOC_STATUS.ssot}

## 1. 产品一句话

一个产品，Town 同构的壳。Portal 管赛区、馆、桌、小时题、结算、Pass、钱包。
卡和战斗不在 Portal：chess 的卡与战斗在 chessArena，tcg 的卡与战斗在 tcgArena，
与 solitaireArena 对等。馆按单人 / 多人分，不按玩法分。

## 2. 明确不是什么

- 不是第二座 Town，不是两座玩法馆（战棋馆 / TCG 馆）。
- 不是 live 8 人 Hearthstone Battlegrounds。
- League 没有 game:、没有 arena:。Arena 是引擎，不是赛区。
- 没有战力匹配，没有按个人图鉴缩放 Boss。
- v1 不开包。商店不卖 Arena 卡。Town Zone 不产 RPG 卡。
- TM 的 teamPower 自适应 Boss 不用于 RPG 同桌计分。
- 图鉴不是战队，不是个人主页，不在这里组队。
- 底栏不按游戏加第 6 键。Pass 不是独立 Tab。

## 3. 分层

L0 Platform　SSO、钱包 scopeKey、门票
L1 Portal　　馆 / 桌 catalog、小时 seed 指针、League(rpg:)、Term Pass、join / settle
L2 Arena　　 chessArena | tcgArena | solitaireArena
　　　　　　 各自：目录、玩家图鉴、尘、负荷冻结、对局、回放
L3 前端　　　${RPG_ROUTE} 壳对标 /town

进场链：选馆 → 选桌 → 预览小时题 → Arena 组 4 人或组套 → Portal.join
→ Arena.freeze + start → submitScore → Portal.settle。
Arena 契约对齐 solitaireArena 的 loadGame(seed) / submitScore。

## 4. League 与 Arena

League 只有三种：${RPG_LEAGUE_SCOPE_KINDS.join(" | ")}

- lobby:{id}　合作方大厅
- town:{id}　 Mayfield；桌上挂 solitaireArena 等
- rpg:{id}　　RPG 秀斗周榜；桌上挂 chess / tcg

钱包 scopeKey = rpg:{rpgId}。周分只在 rpg: 上，chess 秀斗与 tcg 秀斗加在同一条 weeklyPoints。

## 5. 馆与桌

馆 = 竞技形态（对标 Town parlor / saloon）：${RPG_HALL_KINDS.join(" | ")}
- trial　　试炼。单人。不计周分。产 Pass XP 与尘。
- showdown　秀斗。异步多人同题。计入周榜。本小时只记最高一局。

桌 = 游戏类型：${RPG_GAME_TYPES.join(" | ")}
- chess → chessArena
- tcg → tcgArena

默认四桌：${RPG_DEFAULT_TABLES.map((t) => t.id).join(", ")}。
新游戏：两馆各加一桌，不要加第三座馆。

## 6. 小时同题与公平

Portal 存指针：scope × 段位 × gameType × hourKey → seedId。
内容（Boss、地图、牌规）在对应 Arena 展开。

玩家进场前看见 Boss / 地图，再组 4 英雄或卡组，然后加入。Seed 在 join 时锁定。
公平叙事是：公开考题 + 自愿进场 + 段位分桌。不是隐藏 MMR，不是图鉴战力匹配。

基础阵容由各 Arena 段位路发放，必须能通关拿分。克制只影响冲高分，不挡进场。
Boss 数值对同桌固定，不跟个人队伍缩放。

## 7. 经济

Pass 与 Town Term Pass 同构。
- 秀斗完赛 +${RPG_PASS_XP.showdownComplete} XP
- 试炼成功 +${RPG_PASS_XP.trialSuccess} XP
节点发 coin 与 ticket，不发周分，免费轨不发随机功能卡。
约 20 节点：多数 coin，8 与 16 为 ticket，4 与 20 为称号。付费轨可放金卡，不放未解锁功能卡整套。

尘在各 Arena 内定向合成，桶不互通。
开包为 M2 可选，非 v1。v1 商店只花 rpg 钱包 coin 买票。

## 8. 前端壳（对标 Town 五栏）

顺序固定，battle 居中为默认落地：
${RPG_SHELL_TABS.map((tab, i) => `${i + 1}. ${tab.id}  ${tab.path}  ${tab.label}`).join("\n")}

槽位 id 仍用 Town 的 me，表面名是「图鉴」。不要改回「我」，不要改成「战队」。
4 人组在对战 loadout；tcg 是卡组不是战队。

HUD（对局除外）：段位、周战绩、coin、ticket。图鉴页额外显示当前库尘。没有图鉴战力。
对局全屏，隐藏底栏，不露 coin、不露图鉴。

## 9. 对战流

/rpg　两张大卡：秀斗 / 试炼。不要放 chess / tcg 两个大门。
/rpg/hall/:kind　馆内两桌 + 小时 Boss 摘要与倒计时。点桌进预览，不直接开战。
/rpg/table/:id　地图或牌规、Boss、倒计时。「基础 4 人可通关」。主按钮是组队，不是匹配。
loadout　chess：四槽读 chessArena；tcg：套读 tcgArena。确认后 freeze，再 Portal.join。
fullscreen　对应 Arena 引擎。
modal 结算　分数、名次；秀斗才有周分。另列 coin、Pass XP、尘（标明 Arena）。再战锁进场 seed；过点提示已换题。
/rpg/league　同段位 Pod（约 30 人），chess + tcg 秀斗合计。升段 / 保段区。再战仍回馆看题。

## 10. 图鉴（卡牌收集）

路径：${RPG_CODEX.path}　默认库：${RPG_CODEX.defaultGameType}
主业是卡牌收集，落地 TCG。战棋是同一套卡册壳下的另一座库，不是对等第二产品。

有导航，但是页内库导航（${RPG_CODEX_NAV.kind}），不是壳上第 6 栏，也不是玩法馆。
- L0 壳五栏，不含 gameType
- L1 库 chip：一枚 = 一个 gameType / Arena，可横滑
- L2 当前库自己的筛选（schema 随库变）
- L3 网格 → 详情 / 合成；一屏只渲染一座 Arena

路由：${RPG_CODEX_NAV.route}　详情：${RPG_CODEX_NAV.detailRoute}
记住 lastGameType。不强制跟对战当前桌同步。结算「新卡」可深链到详情。
仅一座可收集库时隐藏 chip。

卡面：已有显示张数；未有剪影 + 合成价；新卡角标点进详情后消失。
rank_road 基础卡已有且不可分解，必须够打本段小时题。
张数上限由该库 playableCap 决定（TCG 2，战棋英雄 1），多余才可分解。

尘（当前 Arena 桶，单位如下）
普通 合成 ${RPG_CODEX_DUST.common.craft} / 分解 ${RPG_CODEX_DUST.common.disenchant}
稀有 合成 ${RPG_CODEX_DUST.rare.craft} / 分解 ${RPG_CODEX_DUST.rare.disenchant}
史诗 合成 ${RPG_CODEX_DUST.epic.craft} / 分解 ${RPG_CODEX_DUST.epic.disenchant}
传说 合成 ${RPG_CODEX_DUST.legendary.craft} / 分解 ${RPG_CODEX_DUST.legendary.disenchant}

artId 可跨 Arena 复用。cost / type / rarity / 战斗数值 / 所有权 / 尘不可抄、不可混。

图鉴不做：组队、开包、图鉴战力、混库大网、账号设置当主业（需要则齿轮）。

## 11. 新游戏接入

不要加底栏，不要在对战首页加玩法馆大门。清单：
1. RPG_GAME_TYPES 追加
2. 新 Arena（自带目录、尘、战斗，与 solitaireArena 对等）
3. 试炼、秀斗各加一桌
4. RPG_CODEX.libraries 加一行 → 图鉴自动多一枚 chip

对战父级是馆，图鉴父级是库。同一批 gameType。

## 12. v1 / M2

v1：小时同题、两馆四桌、Town 五栏、TCG 卡册 + 战棋薄库、定向合成、Pass 产币产票。
M2 可选：开包。不进 v1 商店，也不进图鉴主路径。
`.trim();

/** 文档章节标题，便于目录与检索。 */
export const RPG_ARCHITECTURE_DOC_SECTIONS = [
  "产品一句话",
  "明确不是什么",
  "分层",
  "League 与 Arena",
  "馆与桌",
  "小时同题与公平",
  "经济",
  "前端壳",
  "对战流",
  "图鉴",
  "新游戏接入",
  "v1 / M2",
] as const;
