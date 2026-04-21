/**
 * 顶栏桌面图标占位：可替换为独立资源（保持 import 路径或改 HeadNavBarDesktop 尺寸类名）
 */
import navIconPlaceholder from "./assets/nav-button-bg.png";

/** 金币/宝石条共用长方形底图（与快捷图标占位同源，可换横条 PNG） */
export const HEAD_NAV_RES_CARD_PNG: string = navIconPlaceholder;

export const HEAD_NAV_DESKTOP_ICONS: readonly string[] = [
  navIconPlaceholder,
  navIconPlaceholder,
  navIconPlaceholder,
  navIconPlaceholder,
  navIconPlaceholder,
];

export const HEAD_NAV_DESKTOP_ICON_AUTH_SIGNIN = navIconPlaceholder;
export const HEAD_NAV_DESKTOP_ICON_AUTH_LOGOUT = navIconPlaceholder;
