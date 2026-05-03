/** Lobby 底栏导航：桌面与触摸共用 */
export const FOOTER_NAV_URI = [
  "/tactical/lobby/c1",
  "/tactical/lobby/c2",
  "/tactical/lobby/c3",
  "/tactical/lobby/c4",
  "/tactical/map",
] as const;

export const FOOTER_NAV_LABEL = [
  "Child1",
  "Child2",
  "Child3",
  "Child4",
  "Map",
] as const;

export type FooterNavUri = (typeof FOOTER_NAV_URI)[number];
