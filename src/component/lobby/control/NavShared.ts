/** Head 导航（顶栏脚手架）：触摸条与路由常量 */

export const NAV_MENU_ITEMS: { label: string, type: "page" | "modal", uri: string, effect?: { name: string, args?: any } }[] = [
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
    effect: { name: "popCenter", args: { width: "50%", height: "50%" } },
  }]

