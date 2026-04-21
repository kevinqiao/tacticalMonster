/** Lobby 底栏导航：桌面与触摸共用 */
export const FOOTER_NAV_URI = [
  "/play/lobby/c1",
  "/play/lobby/c2",
  "/play/lobby/c3",
  "/play/lobby/c4",
  "/play/map",
] as const;

export const FOOTER_NAV_LABEL = [
  "Child1",
  "Child2",
  "Child3",
  "Child4",
  "Map",
] as const;

export type FooterNavUri = (typeof FOOTER_NAV_URI)[number];
