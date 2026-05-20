/** 休闲大厅底栏 URI（独立于 tactical `FooterNavShared`） */

export const CASUAL_FOOTER_NAV_URI = [
  "/casual/lobby/c1",
  "/casual/lobby/c2",
  "/casual/lobby/c3",
  "/casual/lobby/c4",
  "/casual/lobby/c5",
] as const;

export const CASUAL_FOOTER_NAV_LABEL = ["商店", "历史", "Play", "奖励", "My Town"] as const;

export type CasualFooterNavUri = (typeof CASUAL_FOOTER_NAV_URI)[number];
