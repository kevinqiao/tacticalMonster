/** Casual 底栏桌面 HUD：与 tactical NavShared 同构 */

export const CASUAL_NAV_MENU_ITEMS: {
  label: string;
  type: "page" | "modal";
  uri: string;
  effect?: { name: string; args?: any };
}[] = [
  { label: "Solo", type: "page", uri: "/casual/lobby/c1" },
  { label: "Missions", type: "page", uri: "/casual/lobby/c2" },
  { label: "Tournaments", type: "page", uri: "/casual/lobby/c3" },
  {
    label: "History",
    type: "modal",
    uri: "tournament_history",
    effect: { name: "popCenter", args: { width: "50%", height: "50%" } },
  },
];
