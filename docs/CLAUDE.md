# Web 休闲游戏竞技大厅 · CLAUDE.md

> **本文档角色：愿景与原则索引。**  
> 用于快速对齐「做什么 / 不做什么 / 为什么」；**具体数值、经济、赛季、赛事模板、数据表与实现以休闲平台专用文档与 `casualPlatform` Convex 为准**。  
> Claude Code 启动时可读本文档把握边界；**改逻辑前必读下方 SSOT 链接中的对应章节**。  
> **本仓库仅此一份**愿景索引：路径为 **`docs/CLAUDE.md`**（根目录不再放置副本）。

---

## 1. 执行级单一事实来源（SSOT）

**休闲多游戏平台**（接龙、方块、Merge 等大厅、赛季、Pass、锦标）：

| 主题 | 文档 |
|------|------|
| 经济循环、产出/消耗、XP 递减、Play 模式矩阵 | [`casual-platform-economy-loop-design.md`](./casual-platform-economy-loop-design.md) |
| 经济平衡 `sync` / `balance` / `tune` | [`casual-platform-economy-balance-script.md`](./casual-platform-economy-balance-script.md) |
| 周联赛 cohort / League XP / 周尾 | [`casual-platform-weekly-league-design.md`](./casual-platform-weekly-league-design.md) |
| 经济、锦标 A/B/C、钻/软币（历史） | [`casual-platform-system-design.md`](./casual-platform-system-design.md) |
| 统一赛季、任务、Pass、榜单、专场、商店动线 | [`casual-platform-season-system.md`](./casual-platform-season-system.md) |
| CasualTown（展示与轻社交；非第二养成主循环） | [`casual-platform-town-system.md`](./casual-platform-town-system.md) |
| Town 主题与叙事（岛 / 岛主 / 岛赛；货架名 Arcade League） | [`town-theme-narrative.md`](./town-theme-narrative.md) |
| CasualTown 美术技法与 AI 交付规范（一页纸） | [`casual-town-art-brief.md`](./casual-town-art-brief.md) |
| 大厅 UI / 皮肤 / token SSOT | [`skin/SKIN_DESIGN.md`](./skin/SKIN_DESIGN.md) |
| 大厅与局内 AI 资产清单（非 Town 主插画） | [`casual-lobby-game-art-brief.md`](./casual-lobby-game-art-brief.md) |
| 成就、徽章与长期身份展示 | [`casual-platform-achievement-system-design.md`](./casual-platform-achievement-system-design.md) |
| **周联赛**（cohort 分组、League XP、Bot 填充、周尾升降；**含完整一周测试剧本 §16**） | [`casual-platform-weekly-league-design.md`](./casual-platform-weekly-league-design.md) |
| Battle Pass、皮肤、成就 | [`casual-platform-battle-pass-skins-achievements.md`](./casual-platform-battle-pass-skins-achievements.md) |
| **多游戏 Web 平台 Pass**（SKU、XP、任务、指标） | [`casual-platform-multi-game-pass-design.md`](./casual-platform-multi-game-pass-design.md) |
| **Seed Pipeline**（AI 生成、仿真 Gate、日榜选题、bot 分位） | [`casual-platform-seed-pipeline.md`](./casual-platform-seed-pipeline.md) |
| **再战令 Replay Pass**（日榜/A/B/C 规则、经济、付费平衡） | [`casual-platform-replay-pass-design.md`](./casual-platform-replay-pass-design.md) |

**与 Tactical Monster 的关系：** 同仓可共存，**两条产品线独立**——经济、关卡、锦标规则**不混用**；见 [`casual-platform-system-design.md`](./casual-platform-system-design.md) §0。

---

## 2. 与本仓库已对齐的产品口径（已定）

以下取代本文件历史草案中与实现矛盾的表述：

1. **玩家向话术：** 可使用 **「异步对决」** 保留竞技感。  
2. **结算与架构：** 仍与 **PVE 异步锦标** **同构**——**同一挑战、比成绩**；走现有成绩回写、计奖、**赛季分**与榜；**不与实时 PvP 混榜、混发货币**。未来若做实时对战，须 **独立玩法 ID / 匹配 / 结算**（见经济文档 §0.1）。  
3. **段位：** **赛季分** 为竞技主数据；青铜/白银等 **仅为 UI 分段**（阈值配表）。**不**维护独立 ELO 或第二套升降级算法。附录若出现「ELO 式加减分」「日赛 +20」等，均视为 **历史示意，非实现规范**。
4. **Town 叙事：** 玩家向世界是 **岛**，角色是 **岛主**（永久主人，不是任期）。赛季叙事是 **岛赛**。货架主名锁 **Arcade League**（不要 Isle League / Your Island）。`town` / `/town` 只留内部名。详见 [`town-theme-narrative.md`](./town-theme-narrative.md) §10–§11。

---

## 3. 技术栈（现行实现向）

与历史草案（Express / PostgreSQL / Redis）**不一致**时，**以仓库为准**：

- **前端：** React 18、Vite、Tailwind CSS（移动端优先）。  
- **休闲大厅后端：** **Convex**（`casualPlatform`）；各玩法可有独立 Convex 或 HTTP bridge 回写分数（见 [`casual-platform-town-system.md`](./casual-platform-town-system.md) 架构图）。  
- **账号等：** 以项目已接入方案为准（如 Clerk）；支付以实际 IAP / 支付集成为准，**不以**文中 Stripe 示例为约束。

**原则（仍适用）：** 关键分数与操作 **服务端可验证**；防作弊与风控遵循各玩法与经济文档；实时连接需求随功能演进评估，**非**本文强制栈。

---

## 4. 产品愿景（保留）

**一句话：** 将多款精品休闲玩法置于 **统一赛季与 Pass** 的竞技大厅中，强调 **透明、公平、无现金奖励**；长期可演进 **实时锦标**，但须与异步体系 **清晰分轨**。

**核心差异化（方向性）：**

- Web / PWA，无应用商店分成包袱；合规向 **非现金竞技**。  
- **跨玩法** 共享赛季进度（Pass、任务等以 SSOT 为准）。  
- **展示层**（如 Town）承载成就与社交可见性，**不**替代锦标作为第二经济发动机（见 Town 专文）。  
- **无机器人、成绩可解释**——与人类对手或「同题排行榜」叙事一致时，保持规则透明。  
- **终极目标（可选远期）：** 同步淘汰制锦标等——**仅**在独立玩法与结算就绪后推进。

**不是什么：**

- 不是纯广告聚合站；不是现金奖励 / 博彩向产品；不是关卡制三消主形态；**不**依赖虚拟吉祥物承担身份（成就与收藏驱动身份）。

---

## 5. 原则清单（铁律，落地时逐条对照 SSOT）

以下内容 **方向成立**；具体是否已实现、如何计费，以 [`casual-platform-system-design.md`](./casual-platform-system-design.md) 等为准。

- **非 Pay-to-Win：** 不卖直接改赛果的数值（如直接加分、赛事中违规延长时间、无限提示改结果等）；外观与合规便利项边界见经济文档。  
- **Battle Pass：** **XP / 赛季经验不可直接用钱买**；可有跳级等 **明确边界** 的设计（见 Pass 专文 / 赛季文档）。  
- **变现：** 付费用户体验优先（如零广告等目标与经济文档一致）；限时促销与近失触发可参照产品节奏，**不靠**盲盒赌博化。  
- **Town：** 竞技解锁、访客可见、**不**把 Town 养成做成与赛季锦标 **并行的** 主要发币或进度轨；详见 CasualTown 文档。  
- **Town 叙事：** 世界 = 岛，职称 = 岛主（永久）；赛季 = **岛赛**。货架主名 = **Arcade League**，不要用 Isle League 当商店名。口径见 [`town-theme-narrative.md`](./town-theme-narrative.md) §10–§11。  
- **社交：** 偏重竞技驱动的异步互动；**不**以开放式实时聊天、动态 Feed、礼物经济为早期核心。

---

## 6. 主题索引：想改什么 → 先读哪里

| 想改的内容 | 优先阅读 |
|------------|----------|
| 经济循环、XP 递减、券/币闭环 | [`casual-platform-economy-loop-design.md`](./casual-platform-economy-loop-design.md) |
| 跑经济平衡工具链、产销比回归 | [`casual-platform-economy-balance-script.md`](./casual-platform-economy-balance-script.md) |
| 周联赛、League XP、cohort | [`casual-platform-weekly-league-design.md`](./casual-platform-weekly-league-design.md) |
| 锦标档位、门票、钻闭环 | [`casual-platform-system-design.md`](./casual-platform-system-design.md) |
| Pass 等级、任务、专场券、榜单重置 | [`casual-platform-season-system.md`](./casual-platform-season-system.md) |
| 小镇布局、拜访、异步挑战、与 ingest 边界 | [`casual-platform-town-system.md`](./casual-platform-town-system.md) |
| Town 玩家身份、岛赛与赛季、产品命名 | [`town-theme-narrative.md`](./town-theme-narrative.md) |
| 成就、称号、展示 | [`casual-platform-achievement-system-design.md`](./casual-platform-achievement-system-design.md) |
| 周联赛分组、Bot、周尾奖、**完整一周测试** | [`casual-platform-weekly-league-design.md`](./casual-platform-weekly-league-design.md) §16 |
| 配置与实现细节 | `src/convex/casualPlatform/` 下 schema、service、`casualTournamentConfigs` 等 |
| Seed 生产 / AI Gate / 分位与 rollout | [`casual-platform-seed-pipeline.md`](./casual-platform-seed-pipeline.md) |

---

## 7. 附录：历史草案与创意备忘（非规格）

以下摘自早期产品对话，**仅供灵感与评审**；**禁止**未核对 SSOT 即当作实现或配表依据。

**玩法方向（与 SSOT 中「3～4 款精品」一致）：**

- **Solitaire：** Klondike；同 seed、限时、比分数；异步对决叙事。  
- **Block Blast：** 类方块放置消除；同初始面、限时比分数；远期可考虑实时模式 **独立结算**。  
- **Merge：** 合并益智；赛季积分可与主赛季分体系对齐，**具体**以赛季与经济文档为准。

**赛事「日赛 / 周赛 / 月度」等命名：** 若对外营销使用，**内部**应对应 **A/B/C/专场模板 ID**（见 `casualTournamentConfigs` 与实例服务）；**人数与奖励** 以现网配置为准。

**皮肤与美术：** 多层级皮肤、花色可辨、明暗主题等 **质量条** 仍建议保留；SKU 与价位以商店与运营为准。

**路线图与 DAU 门槛：** 数字仅为历史假设；**以当前项目排期与 SSOT 为准**。

**编码习惯：** TypeScript、组件化、关键逻辑服务端校验、中文注释等 **可与仓库 ESLint/Prettier 规范并存**；REST/WebSocket/Redis 等 **仅**在具体模块采用时参照，**非**全仓强制栈。

---

*文档版本：2.0（愿景索引）*  
*1.0 完整草案已收缩：执行与数值请以同目录 `casual-platform-*.md` + Convex 实现为准。*
