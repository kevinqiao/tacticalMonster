import React, { Suspense, lazy, useLayoutEffect, useSyncExternalStore } from "react";

import { removePortalDocumentStyles } from "component/lobby/portal/usePortalDocumentStyles";

import { PORTAL_URL_PREFIX, rewriteLegacyAppPathname } from "./util/appUrlSegments";

import RenderApp from "./RenderApp";
import RenderModal from "./RenderModal";
import SSOController from "./sso/SSOController";

/** 仅 /gc/preview 懒加载；禁止顶层静态 import，避免 CSS 进入主 bundle */
const PortalGame3DPreviewPage = lazy(
  () => import("component/lobby/portal/3d/PortalGame3DPreviewPage")
);

const STATIC_BOOT_COVER_ID = "static-boot-cover";

const peelStaticBootCover = () => {
  const el = document.getElementById(STATIC_BOOT_COVER_ID);
  if (!el) return;
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  el.setAttribute("aria-hidden", "true");
  requestAnimationFrame(() => el.remove());
};

function subscribeLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("portal-path-changed", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("portal-path-changed", onStoreChange);
  };
}

function readPathname() {
  return window.location.pathname;
}

/**
 * /gc/preview 独立壳层：样式在 Shadow DOM 内，不走 RenderApp / GSAP page_container。
 */
const PortalPreviewRouteApp: React.FC = () => {
  useLayoutEffect(() => {
    peelStaticBootCover();
  }, []);

  return (
    <div
      className="portal-preview-route-shell"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        isolation: "isolate",
        contain: "layout style paint",
        backgroundColor: "#000000",
      }}
    >
      <Suspense fallback={null}>
        <PortalGame3DPreviewPage visible={1} />
      </Suspense>
      <RenderModal />
      <SSOController />
    </div>
  );
};

/** 须在 PageProvider 内：RenderApp 路由依赖 PageManager Context */
export const MainApp: React.FC = () => {
  const pathname = useSyncExternalStore(subscribeLocation, readPathname, () => "");
  const isPortalPreviewRoute = pathname.startsWith(`${PORTAL_URL_PREFIX}/preview`);

  useLayoutEffect(() => {
    const rewritten = rewriteLegacyAppPathname(window.location.pathname);
    if (!rewritten || rewritten === window.location.pathname) return;
    window.history.replaceState(
      window.history.state,
      "",
      rewritten + window.location.search + window.location.hash
    );
    window.dispatchEvent(new Event("portal-path-changed"));
  }, []);

  useLayoutEffect(() => {
    if (!isPortalPreviewRoute) {
      removePortalDocumentStyles();
    }
  }, [isPortalPreviewRoute]);

  if (isPortalPreviewRoute) {
    return <PortalPreviewRouteApp />;
  }

  return (
    <>
      <Suspense fallback={null}>
        <RenderApp />
      </Suspense>
      <RenderModal />
      <SSOController />
    </>
  );
};
