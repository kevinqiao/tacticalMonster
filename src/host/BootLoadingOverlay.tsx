import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getBootBgImageLayers,
  getBootFallbackBg,
} from "./bootTheme";
import {
  isPortalBootRoute,
  PORTAL_BOOT_PAINTED,
} from "./bootHandoff";
import { usePageManager } from "./service/PageManager";
import { useUserManager } from "host/service/UserManager";

type BootPhase = "checking_session" | "loading_critical_assets" | "waiting_page_paint" | "ready";

const OVERLAY_FADE_MS = 280;
const BOOT_LAYER_Z = 500_000;

const STATIC_BOOT_COVER_ID = "static-boot-cover";

const BootLoadingOverlay: React.FC = () => {
  const { user } = useUserManager();
  const { coldBootAssetsReady, pageEvent } = usePageManager();
  const [unmounted, setUnmounted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [portalPainted, setPortalPainted] = useState(false);
  const labelRef = useRef({ primary: "正在进入游戏大厅…", secondary: "Entering game lobby…" });
  const shellRef = useRef<HTMLDivElement | null>(null);

  const portalRoute = isPortalBootRoute();

  useEffect(() => {
    if (!portalRoute) return;
    const onPainted = () => setPortalPainted(true);
    window.addEventListener(PORTAL_BOOT_PAINTED, onPainted);
    return () => window.removeEventListener(PORTAL_BOOT_PAINTED, onPainted);
  }, [portalRoute]);

  const handoffReady = useMemo(() => {
    if (user == null || !coldBootAssetsReady) return false;
    if (portalRoute) return portalPainted;
    return pageEvent?.name === "pageComplete";
  }, [user, coldBootAssetsReady, portalRoute, portalPainted, pageEvent?.name]);

  const phase: BootPhase = useMemo(() => {
    if (user == null) return "checking_session";
    if (!coldBootAssetsReady) return "loading_critical_assets";
    if (!handoffReady) return "waiting_page_paint";
    return "ready";
  }, [user, coldBootAssetsReady, handoffReady]);

  const label = useMemo(() => {
    return { primary: "正在进入游戏大厅…", secondary: "Entering game lobby…" };
  }, []);

  if (phase !== "ready") {
    labelRef.current = label;
  }

  useLayoutEffect(() => {
    if (!fadeOut) return;
    document.getElementById(STATIC_BOOT_COVER_ID)?.remove();
  }, [fadeOut]);

  useLayoutEffect(() => {
    if (!handoffReady || unmounted || fadeOut) return;
    const raf = requestAnimationFrame(() => {
      setFadeOut(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [handoffReady, unmounted, fadeOut]);

  const onOverlayTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "opacity") return;
    if (e.target !== e.currentTarget) return;
    if (fadeOut) setUnmounted(true);
  };

  if (unmounted) return null;

  const showText = phase !== "ready" ? label : labelRef.current;
  const bootFallbackBg = getBootFallbackBg();
  const bootPhotoLayers = getBootBgImageLayers();

  const overlay = (
    <div
      ref={shellRef}
      id="boot-loading-overlay-root"
      role="status"
      aria-live="polite"
      aria-busy={phase !== "ready"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: BOOT_LAYER_Z,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: fadeOut ? "none" : "auto",
        backgroundColor: bootFallbackBg,
        backgroundImage: bootPhotoLayers,
        backgroundSize: "cover, cover",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${OVERLAY_FADE_MS}ms ease-out`,
        transform: "none",
        zoom: 1,
      }}
      onTransitionEnd={onOverlayTransitionEnd}
    >
      <div
        id="boot-loading-text-shell"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div className="boot-loading-spinner" />
        <span className="boot-loading-primary">
          {showText.primary}
        </span>
        <span className="boot-loading-secondary">
          {showText.secondary}
        </span>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
};

export default BootLoadingOverlay;
