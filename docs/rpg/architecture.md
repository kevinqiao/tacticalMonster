# Portal RPG 架构设计

状态：accepted　日期：2026-08-18  
类型 SSOT：`src/convex/rpg/architecture.ts`  
线框： [ui-wireframe.md](./ui-wireframe.md)

## 1. 产品一句话

一个产品，Town 同构的壳。Portal 管赛区、馆、桌、小时题、结算、Pass、钱包。
卡和战斗不在 Portal：chess 的卡与战斗在 chessArena，tcg 的卡与战斗在 tcgArena，
与 solitaireArena 对等。馆按单人 / 多人分，不按玩法分。

## 2. 明确不是什么

- 不是第二座 Town，不是两座玩法馆（战棋馆 / TCG 馆）。
- 不是 live 8 人 Hearthstone Battlegrounds。
- League 没有 `game:`、没有 `arena:`。Arena 是引擎，不是赛区。
- 没有战力匹配，没有按个人图鉴缩放 Boss。
- v1 不开包。商店不卖 Arena 卡。Town Zone 不产 RPG 卡。
- TM 的 teamPower 自适应 Boss 不用于 RPG 同桌计分。
- 图鉴不是战队，不是个人主页，不在这里组队。
- 底栏不按游戏加第 6 键。Pass 不是独立 Tab。

## 3. 分层

- **L0 Platform**　SSO、钱包 scopeKey、门票
- **L1 Portal**　馆 / 桌 catalog、小时 seed 指针、League(`rpg:`)、Term Pass、join / settle
- **L2 Arena**　chessArena \| tcgArena \| solitaireArena  
  各自：目录、玩家图鉴、尘、负荷冻结、对局、回放
- **L3 前端**　`/rpg` 壳对标 `/town`

进场链：选馆 → 选桌 → 预览小时题 → Arena 组 4 人或组套 → Portal.join  
→ Arena.freeze + start → submitScore → Portal.settle。  
Arena 契约对齐 solitaireArena 的 `loadGame(seed)` / `submitScore`。

## 4. League 与 Arena

League 只有三种：`lobby` \| `town` \| `rpg`

- `lobby:{id}`　合作方大厅
- `town:{id}`　Mayfield；桌上挂 solitaireArena 等
- `rpg:{id}`　RPG 秀斗周榜；桌上挂 chess / tcg

钱包 `scopeKey = rpg:{rpgId}`。周分只在 `rpg:` 上，chess 秀斗与 tcg 秀斗加在同一条 `weeklyPoints`。

## 5. 馆与桌

馆 = 竞技形态（对标 Town parlor / saloon）：`trial` \| `showdown`

- **trial**　试炼。单人。不计周分。产 Pass XP 与尘。
- **showdown**　秀斗。异步多人同题。计入周榜。本小时只记最高一局。

桌 = 游戏类型：`chess` \| `tcg`

- chess → chessArena
- tcg → tcgArena

默认四桌：`trial_chess`, `trial_tcg`, `showdown_chess`, `showdown_tcg`。  
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

- 秀斗完赛 +10 XP
- 试炼成功 +4 XP

节点发 coin 与 ticket，不发周分，免费轨不发随机功能卡。  
约 20 节点：多数 coin，8 与 16 为 ticket，4 与 20 为称号。付费轨可放金卡，不放未解锁功能卡整套。

尘在各 Arena 内定向合成，桶不互通。  
开包为 M2 可选，非 v1。v1 商店只花 rpg 钱包 coin 买票。

## 8. 前端壳（对标 Town 五栏）

顺序固定，battle 居中为默认落地：

1. `shop`　`/rpg/shop`　商店
2. `rewards`　`/rpg/rewards`　奖励
3. `battle`　`/rpg`　对战
4. `league`　`/rpg/league`　联赛
5. `me`　`/rpg/me`　图鉴

槽位 id 仍用 Town 的 `me`，表面名是「图鉴」。不要改回「我」，不要改成「战队」。  
4 人组在对战 loadout；tcg 是卡组不是战队。

HUD（对局除外）：段位、周战绩、coin、ticket。图鉴页额外显示当前库尘。没有图鉴战力。  
对局全屏，隐藏底栏，不露 coin、不露图鉴。

## 9. 对战流

- `/rpg`　两张大卡：秀斗 / 试炼。不要放 chess / tcg 两个大门。
- `/rpg/hall/:kind`　馆内两桌 + 小时 Boss 摘要与倒计时。点桌进预览，不直接开战。
- `/rpg/table/:id`　地图或牌规、Boss、倒计时。「基础 4 人可通关」。主按钮是组队，不是匹配。
- loadout　chess：四槽读 chessArena；tcg：套读 tcgArena。确认后 freeze，再 Portal.join。
- fullscreen　对应 Arena 引擎。
- modal 结算　分数、名次；秀斗才有周分。另列 coin、Pass XP、尘（标明 Arena）。再战锁进场 seed；过点提示已换题。
- `/rpg/league`　同段位 Pod（约 30 人），chess + tcg 秀斗合计。升段 / 保段区。再战仍回馆看题。

## 10. 图鉴（卡牌收集）

路径：`/rpg/me`　默认库：`tcg`  
主业是卡牌收集，落地 TCG。战棋是同一套卡册壳下的另一座库，不是对等第二产品。

有导航，但是页内库导航（`inPageLibraryChips`），不是壳上第 6 栏，也不是玩法馆。

- L0 壳五栏，不含 gameType
- L1 库 chip：一枚 = 一个 gameType / Arena，可横滑
- L2 当前库自己的筛选（schema 随库变）
- L3 网格 → 详情 / 合成；一屏只渲染一座 Arena

路由：`/rpg/me/:gameType`　详情：`/rpg/me/:gameType/:cardId`  
记住 lastGameType。不强制跟对战当前桌同步。结算「新卡」可深链到详情。  
仅一座可收集库时隐藏 chip。

卡面：已有显示张数；未有剪影 + 合成价；新卡角标点进详情后消失。  
rank_road 基础卡已有且不可分解，必须够打本段小时题。  
张数上限由该库 playableCap 决定（TCG 2，战棋英雄 1），多余才可分解。

尘（当前 Arena 桶）：

| 稀有 | 合成 | 分解 |
|---|---|---|
| 普通 | 40 | 5 |
| 稀有 | 100 | 20 |
| 史诗 | 400 | 100 |
| 传说 | 1600 | 400 |

artId 可跨 Arena 复用。cost / type / rarity / 战斗数值 / 所有权 / 尘不可抄、不可混。

图鉴不做：组队、开包、图鉴战力、混库大网、账号设置当主业（需要则齿轮）。

## 11. 新游戏接入

不要加底栏，不要在对战首页加玩法馆大门。清单：

1. `RPG_GAME_TYPES` 追加
2. 新 Arena（自带目录、尘、战斗，与 solitaireArena 对等）
3. 试炼、秀斗各加一桌
4. `RPG_CODEX.libraries` 加一行 → 图鉴自动多一枚 chip

对战父级是馆，图鉴父级是库。同一批 gameType。

## 12. v1 / M2

v1：小时同题、两馆四桌、Town 五栏、TCG 卡册 + 战棋薄库、定向合成、Pass 产币产票。  
M2 可选：开包。不进 v1 商店，也不进图鉴主路径。

## 13. UI 线框

逐屏 ascii 与 layout 见 [ui-wireframe.md](./ui-wireframe.md)。
