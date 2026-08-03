/** Head 导航（顶栏脚手架）：触摸条与路由常量 */
export const HEAD_NAV_URI = [
  "/tactical/lobby/c1",
  "/tactical/lobby/c2",
  "/tactical/lobby/c3",
  "/tactical/lobby/c4",
  "/tactical/map",
] as const;

export const HEAD_NAV_LABEL = [
  "Child1",
  "Child2",
  "Child3",
  "Child4",
  "Map",
] as const;
export const HEAD_NAV_MENU_ITEMS: { label: string, type: "page" | "modal", uri: string, effect?: { name: string, args?: any } }[] = [
  {
    label: "Child1",
    type: "page",
    uri: "/tactical/lobby/c1",
  },
  {
    label: "Child2",
    type: "page",
    uri: "/tactical/lobby/c2",
  },
  {
    label: "Child3",
    type: "page",
    uri: "/tactical/lobby/c3",
  },
  {
    label: "Child4",
    type: "modal",
    uri: "tournament_history",
    effect: { name: "swipeRight", args: { width: "50%" } },
  }]

export type HeadNavUri = (typeof HEAD_NAV_URI)[number];
