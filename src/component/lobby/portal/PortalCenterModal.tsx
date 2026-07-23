import gsap from "gsap";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePortalDocumentStylesReady } from "./usePortalDocumentStyles";

type PortalCenterModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional control opposite the close button (e.g. Sign Out). */
  headerStart?: React.ReactNode;
  /** @deprecated 全屏弹层不再使用宽度变体 */
  wide?: boolean;
};

/** Same timing as host `useModalAnimate` swipe effects. */
const OPEN_DUR = 0.5;
const CLOSE_DUR = 0.5;
const OPEN_EASE = "power2.inOut";
const CLOSE_EASE = "power2.inOut";

/**
 * Portal bottom sheet — host `swipeBottom` surface motion:
 * panel rests in open pose (inset in shell); open from `y: 100%` → `0`, close to `y: 100%`.
 * Backdrop opacity is set once (not re-faded) — animating it + backdrop-filter caused mask flicker.
 */
export const PortalCenterModal: React.FC<PortalCenterModalProps> = ({
  open,
  title,
  onClose,
  children,
  headerStart,
}) => {
  const { t } = useTranslation("portal.player");
  const stylesReady = usePortalDocumentStylesReady();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);
  const closingRef = useRef(false);
  /** Prevents re-running open tween while already open (effect dep churn → mask flicker). */
  const openedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  const playOpen = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;
    if (openedRef.current && !closingRef.current) return;

    closingRef.current = false;
    openedRef.current = true;
    tweenRef.current?.kill();

    // Park panel off-screen, show mask at full opacity (no fade — blur+opacity flickers).
    gsap.set(overlay, { visibility: "hidden" });
    gsap.set(panel, { x: 0, y: "100%", autoAlpha: 1, force3D: true });
    if (backdrop) gsap.set(backdrop, { opacity: 1, visibility: "visible" });
    gsap.set(overlay, { visibility: "visible" });

    const tl = gsap.timeline();
    tl.to(panel, { y: 0, duration: OPEN_DUR, ease: OPEN_EASE, force3D: true });
    tweenRef.current = tl;
  }, []);

  const playClose = useCallback((after?: () => void) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const overlay = overlayRef.current;
    if (!panel) {
      after?.();
      return;
    }

    closingRef.current = true;
    tweenRef.current?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        // Hide whole overlay after panel is off-screen. Keep mask opaque until then.
        if (overlay) gsap.set(overlay, { visibility: "hidden" });
        if (backdrop) gsap.set(backdrop, { opacity: 0 });
        openedRef.current = false;
        closingRef.current = false;
        after?.();
      },
    });
    tl.to(panel, { y: "100%", duration: CLOSE_DUR, ease: CLOSE_EASE, force3D: true });
    tweenRef.current = tl;
  }, []);

  useLayoutEffect(() => {
    if (open && stylesReady) {
      setMounted(true);
    }
  }, [open, stylesReady]);

  useLayoutEffect(() => {
    if (!mounted) return;
    if (open && stylesReady) {
      playOpen();
      return;
    }
    if (!open && openedRef.current && !closingRef.current) {
      playClose(() => setMounted(false));
    }
  }, [open, mounted, stylesReady, playClose, playOpen]);

  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
    };
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!mounted) return null;

  return (
    <div
      ref={overlayRef}
      className="portal-modal-overlay portal-modal-overlay--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-modal-title"
    >
      <button
        ref={backdropRef}
        type="button"
        className="portal-modal-backdrop"
        aria-label={t("common.close")}
        onClick={handleClose}
      />
      <div className="portal-modal-shell">
        <div ref={panelRef} className="portal-modal-panel portal-modal-panel--fullscreen">
          <div className="portal-modal-head">
            {headerStart ? (
              <div className="portal-modal-headStart">{headerStart}</div>
            ) : null}
            <h2 id="portal-modal-title">{title}</h2>
            <button
              type="button"
              className="portal-modal-close"
              onClick={handleClose}
              aria-label={t("common.close")}
            >
              ×
            </button>
          </div>
          <div className="portal-modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
};
