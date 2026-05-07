/** Casual 底栏桌面 HUD：与 tactical NavShared 同构；锦标历史入口在 Play Tab 模态 */

export const CASUAL_NAV_MENU_ITEMS: {
  label: string;
  type: "page" | "modal";
  uri: string;
  effect?: { name: string; args?: any };
}[] = [
  { label: "商店", type: "page", uri: "/casual/lobby/c1" },
  { label: "任务", type: "page", uri: "/casual/lobby/c2" },
  { label: "Play", type: "page", uri: "/casual/lobby/c3" },
  { label: "奖励", type: "page", uri: "/casual/lobby/c4" },
  { label: "排行榜", type: "page", uri: "/casual/lobby/c5" },
];
