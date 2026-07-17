import gsap from "gsap";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePortalDocumentStylesReady } from "./usePortalDocumentStyles";

type PortalCenterModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** @deprecated 全屏弹层不再使用宽度变体 */
  wide?: boolean;
};

/** Same timing as host `useModalAnimate` swipe effects. */
const OPEN_DUR = 0.5;
const CLOSE_DUR = 0.5;
const OPEN_EASE = "power2.inOut";
const CLOSE_EASE = "power2.inOut";

/**
 * Portal bottom sheet — animation matches host `swipeBottom` in
 * `src/host/useModalAnimate.ts`: park at `top: 100%`, then tween `y: "-100%"`.
 * Close control lives in the sheet head and moves with the panel (no separate fade/hide).
 */
export const PortalCenterModal: React.FC<PortalCenterModalProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  const { t } = useTranslation("portal.player");
  const stylesReady = usePortalDocumentStylesReady();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const tweenRef = useRef<gsap.core.Animation | null>(null);
  const [mounted, setMounted] = useState(false);

  const sheetHeight = () => {
    // Narrow viewports: edge-to-edge with a small top gap (matches portal_3d_modal).
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 963px)").matches) {
      return "calc(100% - 8px)";
    }
    return "calc(100% - 16px)";
  };

  const playOpen = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;

    tweenRef.current?.kill();
    gsap.set(overlay, { visibility: "visible" });

    // Mirror host swipeBottom open pose (useModalAnimate.ts).
    gsap.set(panel, {
      top: "100%",
      left: 0,
      right: "auto",
      bottom: "auto",
      width: "100%",
      height: sheetHeight(),
      x: 0,
      y: 0,
      autoAlpha: 1,
    });
    if (backdrop) gsap.set(backdrop, { autoAlpha: 0 });

    const tl = gsap.timeline();
    tl.to(panel, { y: "-100%", duration: OPEN_DUR, ease: OPEN_EASE });
    if (backdrop) {
      tl.to(backdrop, { autoAlpha: 1, duration: OPEN_DUR, ease: OPEN_EASE }, "<");
    }
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

    tweenRef.current?.kill();
    // Mirror host swipeBottom close: return to y:0 while still parked at top:100%.
    const tl = gsap.timeline({
      onComplete: () => {
        if (overlay) gsap.set(overlay, { visibility: "hidden" });
        gsap.set(panel, { x: 0, y: 0, autoAlpha: 0 });
        after?.();
      },
    });
    tl.to(panel, { y: 0, duration: CLOSE_DUR, ease: CLOSE_EASE });
    if (backdrop) {
      tl.to(backdrop, { autoAlpha: 0, duration: CLOSE_DUR, ease: CLOSE_EASE }, "<");
    }
    tweenRef.current = tl;
  }, []);

  // Defer mount until theme CSS is ready so first paint is not FOUC.
  useLayoutEffect(() => {
    if (open && stylesReady) {
      setMounted(true);
    }
  }, [open, stylesReady]);

  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  // Apply open/close before browser paint to avoid one-frame full-panel flash.
  useLayoutEffect(() => {
    if (!mounted) return;
    if (open && stylesReady) {
      playOpen();
      return;
    }
    if (!open) {
      playClose(() => setMounted(false));
    }
  }, [open, mounted, stylesReady, playClose, playOpen]);

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
