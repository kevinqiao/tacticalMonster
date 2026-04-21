/** Head 导航（顶栏脚手架）：触摸条与路由常量 */
export const HEAD_NAV_URI = [
  "/play/lobby/c1",
  "/play/lobby/c2",
  "/play/lobby/c3",
  "/play/lobby/c4",
  "/play/map",
] as const;

export const HEAD_NAV_LABEL = [
  "Child1",
  "Child2",
  "Child3",
  "Child4",
  "Map",
] as const;
export const HEAD_NAV_MENU_ITEMS: { label: string, type: "page" | "modal", uri: string }[] = [
  {
    label: "Child1",
    type: "page",
    uri: "/play/lobby/c1",
  },
  {
    label: "Child2",
    type: "page",
    uri: "/play/lobby/c2",
  },
  {
    label: "Child3",
    type: "page",
    uri: "/play/lobby/c3",
  },
  {
    label: "Child4",
    type: "modal",
    uri: "tournament_history",
  }]

export type HeadNavUri = (typeof HEAD_NAV_URI)[number];
