import React, { createContext, useContext, useLayoutEffect, useState } from "react";

import portalCssUrl from "./portal.css?url";
import portal3dModalCssUrl from "./3d/portal_3d_modal.css?url";
import solitaireFigmaCssUrl from "./solitaire-figma.css?url";

export const PORTAL_ROUTE_THEME_ATTR = "data-portal-route-theme";

const PORTAL_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@800;900&display=swap";

const PortalDocumentStylesReadyContext = createContext(true);

function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  // Already applied (cached / previously injected).
  if (link.sheet != null) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", done, { once: true });
  });
}

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

/** Ref-count injects so React Strict Mode remount does not yank CSS mid-frame (modal flash). */
let portalThemeInjectCount = 0;

/** 仅在 Portal 路由挂载时注入主题 CSS；卸载时从 document.head 移除，避免污染其它页面。 */
export function usePortalDocumentStyles(active = true): boolean {
  const [ready, setReady] = useState(() => {
    if (!active || typeof document === "undefined") return !active;
    // Warm cache: all sheets already present and parsed.
    const ids = [
      "portal-route-portal-css",
      "portal-route-solitaire-figma-css",
      "portal-route-3d-modal-css",
    ];
    return ids.every((id) => {
      const el = document.getElementById(id);
      return el instanceof HTMLLinkElement && el.sheet != null;
    });
  });

  useLayoutEffect(() => {
    if (!active) {
      setReady(true);
      return;
    }

    let cancelled = false;
    portalThemeInjectCount += 1;
    const links = [
      appendThemeLink(PORTAL_FONT_HREF, "portal-route-font-css"),
      appendThemeLink(portalCssUrl, "portal-route-portal-css"),
      appendThemeLink(solitaireFigmaCssUrl, "portal-route-solitaire-figma-css"),
      // 3D 卡通弹窗主题：必须最后注入以覆盖前两者
      appendThemeLink(portal3dModalCssUrl, "portal-route-3d-modal-css"),
    ];

    // Fonts can lag; modal chrome CSS must be ready before first open paint.
    const critical = links.slice(1);
    void Promise.all(critical.map(waitForStylesheet)).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      portalThemeInjectCount = Math.max(0, portalThemeInjectCount - 1);
      // Strict Mode remounts immediately; keep sheets until the last consumer leaves.
      if (portalThemeInjectCount === 0) {
        links.forEach((link) => {
          // Only remove if we still own the same node (another mount may have reused ids).
          if (link.isConnected && document.getElementById(link.id) === link) {
            link.remove();
          }
        });
        setReady(false);
      }
    };
  }, [active]);

  return ready;
}

export function PortalDocumentStylesProvider({
  active = true,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  const ready = usePortalDocumentStyles(active);
  return (
    <PortalDocumentStylesReadyContext.Provider value={ready}>
      {children}
    </PortalDocumentStylesReadyContext.Provider>
  );
}

/** When true, portal modal theme CSS (incl. cartoon overrides) is applied. */
export function usePortalDocumentStylesReady(): boolean {
  return useContext(PortalDocumentStylesReadyContext);
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
