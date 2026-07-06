import { useLayoutEffect } from "react";

import portalCssUrl from "./portal.css?url";
import portal3dModalCssUrl from "./3d/portal_3d_modal.css?url";
import solitaireFigmaCssUrl from "./solitaire-figma.css?url";

export const PORTAL_ROUTE_THEME_ATTR = "data-portal-route-theme";

const PORTAL_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@800;900&display=swap";

function appendThemeLink(href: string, id: string): HTMLLinkElement {
  const existing = document.getElementById(id);
  if (existing instanceof HTMLLinkElement) return existing;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute(PORTAL_ROUTE_THEME_ATTR, "true");
  document.head.appendChild(link);
  return link;
}

/** 仅在 Portal 路由挂载时注入主题 CSS；卸载时从 document.head 移除，避免污染其它页面。 */
export function usePortalDocumentStyles(active = true) {
  useLayoutEffect(() => {
    if (!active) return;

    const links = [
      appendThemeLink(PORTAL_FONT_HREF, "portal-route-font-css"),
      appendThemeLink(portalCssUrl, "portal-route-portal-css"),
      appendThemeLink(solitaireFigmaCssUrl, "portal-route-solitaire-figma-css"),
      // 3D 卡通弹窗主题：必须最后注入以覆盖前两者
      appendThemeLink(portal3dModalCssUrl, "portal-route-3d-modal-css"),
    ];

    return () => {
      links.forEach((link) => link.remove());
    };
  }, [active]);
}

const PORTAL_THEME_HREF_RE =
  /portal\.css|portal_3d|solitaire-figma|solitaire-cartoon|portal-static/i;

/** 清除 document 上所有 Portal 主题残留（含 Vite HMR 注入的旧样式） */
export function removePortalDocumentStyles() {
  document.querySelectorAll(`link[${PORTAL_ROUTE_THEME_ATTR}]`).forEach((el) => el.remove());
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.href || "";
    if (PORTAL_THEME_HREF_RE.test(href)) link.remove();
  });
  document.querySelectorAll("style").forEach((style) => {
    const devId = style.getAttribute("data-vite-dev-id") || "";
    if (PORTAL_THEME_HREF_RE.test(devId)) style.remove();
  });
}
