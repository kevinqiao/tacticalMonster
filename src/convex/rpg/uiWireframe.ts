/**
 * RPG UI 线框（已定稿）
 *
 * 把 Town 五栏壳、对战流、图鉴库导航的线框收口入库。
 * 人类可读稿：docs/rpg/ui-wireframe.md
 * Canvas 只是预览，不进 git；实现以本文件 + ./architecture.ts 为准。
 *
 * 状态：accepted
 * 日期：2026-08-18
 */
import {
  RPG_CODEX_NAV,
  RPG_SHELL_TABS,
  type RpgHallKind,
  type RpgShellTabId,
  type RpgUiScreenId,
} from "./architecture";

export const RPG_UI_WIREFRAME_STATUS = {
  status: "accepted",
  date: "2026-08-18",
  ssot: "src/convex/rpg/architecture.ts",
  wireframe: "src/convex/rpg/uiWireframe.ts",
} as const;

export const RPG_UI_CHROME = {
  hud: ["tier", "weekRecord", "coins", "tickets"],
  hudCodexExtra: ["arenaDust"],
  tabBar: RPG_SHELL_TABS.map((tab) => tab.label),
  matchHidesTabs: true,
  noCollectionPower: true,
} as const;

export type RpgWireframeId =
  | RpgUiScreenId
  | "codexAlbum"
  | "codexDetail"
  | "codexCraft"
  | "codexChess";

export type RpgUiWireframeScreen = {
  id: RpgWireframeId;
  path: string;
  shellTab: RpgShellTabId | "none";
  title: string;
  hud: "shell" | "codex" | "match" | "none";
  cta: string;
  layout: string[];
  notes: string[];
  ascii: string;
};

const TAB = "商店  奖励  [对战]  联赛  图鉴";

export const RPG_UI_WIREFRAMES: readonly RpgUiWireframeScreen[] = [
  {
    id: "shop",
    path: "/rpg/shop",
    shellTab: "shop",
    title: "商店",
    hud: "shell",
    cta: "购买",
    layout: ["HUD", "门票 x1 · 100 coin", "门票 x5 · 450 coin", "v1 不开包、不卖卡", "底栏"],
    notes: [
      "rpg:{rpgId} 钱包花 coin 买票。",
      "v1 不开包。chess/tcg 卡不进 Portal 商店。",
      "跟 Town shop 同构。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ 商店                                         │
│ rpg 钱包 · 花 coin 买票                      │
│ ┌─────────────────────────────────────────┐ │
│ │ 门票 x1                          100    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 门票 x5                          450    │ │
│ └─────────────────────────────────────────┘ │
│ v1 不开包，不卖 chess / tcg 卡               │
├ [商店]  奖励   对战   联赛   图鉴           ┤
`.trim(),
  },
  {
    id: "rewards",
    path: "/rpg/rewards",
    shellTab: "rewards",
    title: "奖励",
    hud: "shell",
    cta: "领取",
    layout: ["HUD", "任期 Pass 节点 8", "进度条", "下一档 ticket", "领取", "底栏"],
    notes: [
      "20 节点镜像 Town：多数 coin，8/16 ticket，4/20 称号。",
      "XP：秀斗 +10，试炼成功 +4。领取不是拆包。",
      "Pass 不是独立 Tab，并进本栏。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ 任期奖励 · 节点 8                            │
│ ████████░░░░░░░░  下一档 ticket x1           │
│ 已领：coin 460 · 票 1 · 称号 1               │
│ ┌─────────────────────────────────────────┐ │
│ │                 领取                    │ │
│ └─────────────────────────────────────────┘ │
├ 商店  [奖励]  对战   联赛   图鉴             ┤
`.trim(),
  },
  {
    id: "home",
    path: "/rpg",
    shellTab: "battle",
    title: "对战首页",
    hud: "shell",
    cta: "进秀斗 / 进试炼",
    layout: ["HUD", "本小时题倒计时", "秀斗馆大卡", "试炼馆大卡", "底栏"],
    notes: [
      "先选竞技形态。不要放 chess/tcg 两个大门。",
      "秀斗计入周榜，试炼不计周分。",
      "副行倒计时把人推进馆，不是开包。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ 对战 · 本小时题 37 分后刷新                  │
│ ┌─────────────────────────────────────────┐ │
│ │ 秀斗馆                                  │ │
│ │ 多人同题 · 计入周榜                     │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 试炼馆                                  │ │
│ │ 单人挑战 · 不计周分                     │ │
│ └─────────────────────────────────────────┘ │
├ 商店  奖励  [对战]  联赛   图鉴             ┤
`.trim(),
  },
  {
    id: "hall",
    path: "/rpg/hall/:kind",
    shellTab: "battle",
    title: "馆内桌",
    hud: "shell",
    cta: "选题",
    layout: ["HUD", "馆名", "chess 桌行", "tcg 桌行", "底栏"],
    notes: [
      "每桌：gameType、本小时 Boss 缩略、倒计时。",
      "点桌进预览，不直接开战。",
      "秀斗标明计入周榜；试炼标明产 Pass XP。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ 秀斗馆 · chess / tcg 桌共用周分              │
│ ┌─────────────────────────────────────────┐ │
│ │ chess 桌 · 典狱官 · 高防 · 23 分        │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ tcg 桌 · 同一小时 · 另一份牌规          │ │
│ └─────────────────────────────────────────┘ │
├ 商店  奖励  [对战]  联赛   图鉴             ┤
`.trim(),
  },
  {
    id: "preview",
    path: "/rpg/table/:id",
    shellTab: "battle",
    title: "小时题",
    hud: "shell",
    cta: "组 4 人 / 组套",
    layout: ["HUD", "倒计时", "地图预览", "Boss 标签", "基础阵容可通关", "组队按钮", "底栏"],
    notes: [
      "看题是公平叙事入口。主按钮不是匹配。",
      "Boss 固定。克制只加分，不挡进场。",
      "chess 组 4 人；tcg 组套。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ 秀斗 · chess · 23:12                         │
│ ┌─────────────────────────────────────────┐ │
│ │           地图预览 · 固定 Boss          │ │
│ └─────────────────────────────────────────┘ │
│ 典狱官 · 高防 / 召唤                         │
│ 基础 4 人可通关。克制只加分。                │
│ ┌─────────────────────────────────────────┐ │
│ │                 组 4 人                 │ │
│ └─────────────────────────────────────────┘ │
├ 商店  奖励  [对战]  联赛   图鉴             ┤
`.trim(),
  },
  {
    id: "loadout",
    path: "loadout",
    shellTab: "battle",
    title: "组队",
    hud: "shell",
    cta: "进入本题",
    layout: ["HUD", "chess 2x2 槽 或 tcg 套", "缺位用基础补", "进入本题", "底栏"],
    notes: [
      "读对应 Arena。确认后 freeze，再 Portal.join。",
      "中途改图鉴不影响本局。",
      "不在图鉴页组队。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ chessArena 英雄                              │
│ ┌──────────┐ ┌──────────┐                    │
│ │ 守卫     │ │ 刺客     │                    │
│ └──────────┘ └──────────┘                    │
│ ┌──────────┐ ┌──────────┐                    │
│ │ 治疗     │ │ 空       │                    │
│ └──────────┘ └──────────┘                    │
│ 本段基础库已解锁 · 确认后 freeze             │
│ ┌─────────────────────────────────────────┐ │
│ │                进入本题                 │ │
│ └─────────────────────────────────────────┘ │
├ 商店  奖励  [对战]  联赛   图鉴             ┤
`.trim(),
  },
  {
    id: "match",
    path: "fullscreen",
    shellTab: "none",
    title: "对局",
    hud: "match",
    cta: "交卷",
    layout: ["本题 HUD + 交卷", "棋盘或手牌+Boss", "出战条", "无底栏"],
    notes: [
      "全屏，隐藏五栏。不露 coin、不露图鉴。",
      "chess 棋盘；tcg 手牌加 Boss 血条。",
      "Boss 数值固定，不跟个人队伍缩放。",
    ],
    ascii: `
┌ 典狱官 24/30     回合 4              交卷 ┐
│                                           │
│              chessArena 棋盘              │
│                                           │
├ 守卫   刺客   治疗   坦克                 ┤
`.trim(),
  },
  {
    id: "result",
    path: "modal",
    shellTab: "battle",
    title: "结算",
    hud: "shell",
    cta: "再战本题",
    layout: ["HUD", "分数 · 名次", "周分（秀斗）", "coin / Pass XP / 尘", "再战", "底栏"],
    notes: [
      "秀斗才有周分，本小时只记最高一局。",
      "尘标明来自哪座 Arena。",
      "再战锁进场 seed；过点提示已换题。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ 1840 分 · 同桌第 2                           │
│ 秀斗周分 +3 · 本小时最高已记                 │
│ +40 coin · Pass +10 XP · 尘 +8（chessArena） │
│ ┌─────────────────────────────────────────┐ │
│ │                再战本题                 │ │
│ └─────────────────────────────────────────┘ │
│ 或回馆换 tcg 桌                              │
├ 商店  奖励  [对战]  联赛   图鉴             ┤
`.trim(),
  },
  {
    id: "league",
    path: "/rpg/league",
    shellTab: "league",
    title: "联赛",
    hud: "shell",
    cta: "回对战看题",
    layout: ["HUD", "段位 · Pod", "chess+tcg 合计说明", "名次表", "升降区", "底栏"],
    notes: [
      "一条 rpg: 周榜。不按图鉴战力排序。",
      "Pod 约 30 人。升段 1-3，保段 4-8。",
      "再战秀斗仍回馆看题。",
    ],
    ascii: `
┌ 金 III          周 4 胜          1200 · 票 3 ┐
│ 金 III · Pod 12/30                           │
│ chess + tcg 秀斗合计                         │
│ 1 你                              28 分      │
│ 2 对手 A                          25 分      │
│ 3 对手 B                          21 分      │
│ 升段区 1-3 · 保段 4-8                        │
├ 商店  奖励   对战  [联赛]  图鉴             ┤
`.trim(),
  },
  {
    id: "codexAlbum",
    path: RPG_CODEX_NAV.route,
    shellTab: "me",
    title: "图鉴 · 卡册",
    hud: "codex",
    cta: "打开卡",
    layout: ["HUD+尘", "库导航 TCG | 战棋", "进度", "筛选", "3 列卡面", "底栏"],
    notes: [
      "默认 /rpg/me/tcg。一枚 chip 一个 gameType。",
      "网格只渲染当前 Arena。新游戏加 chip，不加底栏。",
      "不在这里组队。不要叫战队。",
    ],
    ascii: `
┌ 金 III     1200 · 票 3              尘 340 ┐
│ [TCG]  战棋  （新游戏横滑）                  │
│ tcgArena · 48/72                             │
│ [全部]  已有  未有                           │
│ ┌────┐ ┌────┐ ┌────┐                         │
│ │铁墙│ │治疗│ │火球│                         │
│ │ x2 │ │ x2 │ │ x1 │                         │
│ └────┘ └────┘ └────┘                         │
│ ┌────┐ ┌────┐ ┌────┐                         │
│ │龙息│ │暗影│ │契约│                         │
│ │ 新 │ │400 │ │100 │                         │
│ └────┘ └────┘ └────┘                         │
├ 商店  奖励   对战   联赛  [图鉴]            ┤
`.trim(),
  },
  {
    id: "codexDetail",
    path: RPG_CODEX_NAV.detailRoute,
    shellTab: "me",
    title: "图鉴 · 卡详情",
    hud: "codex",
    cta: "合成 / 返回卡册",
    layout: ["HUD+尘", "大卡面", "所属 Arena 规则", "张数", "合成或分解", "底栏"],
    notes: [
      "数值只读所属 Arena。未满且尘够才显示合成。",
      "rank_road 不可分解。不从详情进对局。",
      "新角标点进后消失。",
    ],
    ascii: `
┌ 金 III     1200 · 票 3              尘 340 ┐
│ 火球 · 4 费法术 · 稀有                       │
│ ┌─────────────────────────────────────────┐ │
│ │ tcgArena · 造成 6 点伤害                │ │
│ └─────────────────────────────────────────┘ │
│ 张数 1/2 · 合成 100 尘                       │
│ [合成第 2 张]     [返回卡册]                 │
├ 商店  奖励   对战   联赛  [图鉴]            ┤
`.trim(),
  },
  {
    id: "codexCraft",
    path: "modal · craft",
    shellTab: "me",
    title: "图鉴 · 合成确认",
    hud: "codex",
    cta: "确认",
    layout: ["当前库尘", "消耗", "结果确定 1/2→2/2", "确认 / 取消"],
    notes: [
      "扣当前 Arena 尘。结果确定，不是开包。",
      "tcg 尘不能合成 chess 卡，反过来也不行。",
    ],
    ascii: `
┌ 金 III     1200 · 票 3              尘 340 ┐
│ 合成 火球                                    │
│ 100 tcgArena 尘 · 余额 340 → 240             │
│ 火球 1/2 → 2/2。不是开包。                   │
│ [确认]                 [取消]                │
├ 商店  奖励   对战   联赛  [图鉴]            ┤
`.trim(),
  },
  {
    id: "codexChess",
    path: "/rpg/me/chess",
    shellTab: "me",
    title: "图鉴 · 战棋库",
    hud: "codex",
    cta: "无（v1 不组队）",
    layout: ["HUD+尘", "库导航 战棋选中", "本段 12/12", "英雄卡网格", "底栏"],
    notes: [
      "同一套卡册壳，gameType=chess。不是第二产品。",
      "v1 可不做英雄合成。4 人仍去对战组。",
      "新游戏复制：/rpg/me/:gameType。",
    ],
    ascii: `
┌ 金 III     1200 · 票 3              尘另桶 ┐
│ TCG  [战棋]                                  │
│ chessArena · 本段 12/12 已解锁               │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│ │守卫│ │刺客│ │治疗│ │坦克│                  │
│ └────┘ └────┘ └────┘ └────┘                  │
│ v1 不在这里组 4 人                           │
├ 商店  奖励   对战   联赛  [图鉴]            ┤
`.trim(),
  },
];

/** roster 仍是壳上的图鉴入口；卡册细节见 codex* 屏。 */
export const RPG_UI_WIREFRAME_HALL_VARIANTS: Record<
  RpgHallKind,
  { title: string; sub: string }
> = {
  showdown: { title: "秀斗馆", sub: "chess / tcg 桌共用周分" },
  trial: { title: "试炼馆", sub: "产 Pass XP · 尘" },
};

export const RPG_UI_NAV_LAYERS = [
  {
    id: "L0",
    where: "底栏五键",
    switches: "商店 / 奖励 / 对战 / 联赛 / 图鉴",
    not: "第 6 个游戏 Tab",
  },
  {
    id: "L1",
    where: "图鉴 HUD 下横滑 chip",
    switches: "TCG / 战棋 / 新游戏",
    not: "两座玩法馆大门",
  },
  {
    id: "L2",
    where: "当前库内部",
    switches: "已有、费用、稀有… schema 随库变",
    not: "一套筛子硬套所有游戏",
  },
  {
    id: "L3",
    where: "网格 → 详情",
    switches: "当前 Arena 的卡或英雄卡",
    not: "混库一张大网",
  },
] as const;

export const RPG_UI_WIREFRAME_DOCUMENT = `
# Portal RPG UI 线框

状态：${RPG_UI_WIREFRAME_STATUS.status}　日期：${RPG_UI_WIREFRAME_STATUS.date}
规格：${RPG_UI_WIREFRAME_STATUS.wireframe}
架构 SSOT：${RPG_UI_WIREFRAME_STATUS.ssot}

Canvas 预览不进仓库。实现按 RPG_UI_WIREFRAMES 的 path / layout / ascii。

## 壳

对标 /town，五栏顺序固定，battle 居中：
${RPG_SHELL_TABS.map((tab, i) => `${i + 1}. ${tab.id}  ${tab.path}  ${tab.label}`).join("\n")}

底栏：${TAB.replace("[对战]", "对战")}
对局全屏隐藏底栏。HUD 无图鉴战力。图鉴 HUD 多当前库尘。

## 导航

对战：馆 → 桌(gameType) → 小时题。
图鉴：库(gameType) → 筛选 → 卡。
同一批游戏，父级不同。新游戏加桌 + 加 chip，不加底栏。

${RPG_UI_NAV_LAYERS.map((layer) => `${layer.id} ${layer.where} · 切 ${layer.switches} · 不要 ${layer.not}`).join("\n")}

## 屏清单

${RPG_UI_WIREFRAMES.map((screen) => `### ${screen.title}  \`${screen.path}\`
CTA：${screen.cta}
${screen.notes.map((note) => `- ${note}`).join("\n")}

${screen.ascii}
`).join("\n")}
`.trim();
