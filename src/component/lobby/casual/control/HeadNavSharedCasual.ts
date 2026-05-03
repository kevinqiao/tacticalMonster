/** Casual 顶栏 HUD：路由与竖屏菜单（与 tactical HeadNavShared 同构，URI 指向 `/casual/lobby`） */

export const CASUAL_HEAD_NAV_URI = [
  "/casual/lobby/c1",
  "/casual/lobby/c2",
  "/casual/lobby/c3",
] as const;

export const CASUAL_HEAD_NAV_LABEL = ["Solo", "Missions", "Tournaments"] as const;

export const CASUAL_HEAD_NAV_MENU_ITEMS: {
  label: string;
  type: "page" | "modal";
  uri: string;
  effect?: { name: string; args?: any };
}[] = [
  { label: "Solo", type: "page", uri: "/casual/lobby/c1" },
  { label: "Missions", type: "page", uri: "/casual/lobby/c2" },
  { label: "Tournaments", type: "page", uri: "/casual/lobby/c3" },
  {
    label: "Tournament history",
    type: "modal",
    uri: "tournament_history",
    effect: { name: "swipeRight", args: { width: "50%" } },
  },
];

export type CasualHeadNavUri = (typeof CASUAL_HEAD_NAV_URI)[number];
