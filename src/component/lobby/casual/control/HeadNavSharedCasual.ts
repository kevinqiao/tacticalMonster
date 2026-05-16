/** Casual 顶栏 HUD：路由与竖屏菜单（与 tactical HeadNavShared 同构） */

/** 顶栏常驻「通行证」与竖屏菜单共用 */
export const CASUAL_BATTLE_PASS_MODAL_OPEN = {
  name: "casual_battle_pass",
  effect: { name: "swipeRight", args: { width: "min(100%, 800px)" } },
} as const;

/** 头像打开个人资料（popCenter）；内含 Logout */
export const CASUAL_PLAYER_PROFILE_MODAL_OPEN = {
  name: "casual_player_profile",
  effect: { name: "popCenter", args: { width: "88%", maxWidth: "400px", height: "auto" } },
} as const;

export const CASUAL_HEAD_NAV_URI = [
  "/casual/lobby/c1",
  "/casual/lobby/c2",
  "/casual/lobby/c3",
  "/casual/lobby/c4",
  "/casual/lobby/c5",
] as const;

export const CASUAL_HEAD_NAV_LABEL = ["商店", "历史", "Play", "奖励", "通行证"] as const;

/** 竖屏汉堡菜单：五页；赛季通行证全页为 c5；顶栏右侧另有侧栏快捷入口 */
export const CASUAL_HEAD_NAV_MENU_ITEMS: {
  label: string;
  type: "page" | "modal";
  uri: string;
  effect?: { name: string; args?: any };
}[] = [
  { label: "商店", type: "page", uri: "/casual/lobby/c1" },
  { label: "历史", type: "page", uri: "/casual/lobby/c2" },
  { label: "Play", type: "page", uri: "/casual/lobby/c3" },
  { label: "奖励", type: "page", uri: "/casual/lobby/c4" },
  { label: "通行证", type: "page", uri: "/casual/lobby/c5" },
];

export type CasualHeadNavUri = (typeof CASUAL_HEAD_NAV_URI)[number];
