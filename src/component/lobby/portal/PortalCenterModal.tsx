import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type PortalCenterModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** @deprecated 全屏弹层不再使用宽度变体 */
  wide?: boolean;
};

const OPEN_DUR = 0.5;
const CLOSE_DUR = 0.5;
const OPEN_EASE = "power2.inOut";
const CLOSE_EASE = "power2.inOut";

export const PortalCenterModal: React.FC<PortalCenterModalProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  const { t } = useTranslation("portal.player");
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);
  const [mounted, setMounted] = useState(open);

  const playOpen = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel) return;

    tweenRef.current?.kill();
    gsap.set(panel, { y: "100%", autoAlpha: 1 });
    if (backdrop) gsap.set(backdrop, { autoAlpha: 0 });

    const tl = gsap.timeline();
    tl.to(panel, { y: 0, duration: OPEN_DUR, ease: OPEN_EASE });
    if (backdrop) {
      tl.to(backdrop, { autoAlpha: 1, duration: OPEN_DUR, ease: OPEN_EASE }, "<");
    }
    tweenRef.current = tl;
  }, []);

  const playClose = useCallback(
    (after?: () => void) => {
      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      const overlay = overlayRef.current;
      if (!panel) {
        after?.();
        return;
      }

      tweenRef.current?.kill();
      const tl = gsap.timeline({
        onComplete: () => {
          // 勿 clearProps transform：会把 y 重置为 0，卸载前会闪一下主页
          if (overlay) gsap.set(overlay, { visibility: "hidden" });
          after?.();
        },
      });
      tl.to(panel, { y: "100%", duration: CLOSE_DUR, ease: CLOSE_EASE });
      if (backdrop) {
        tl.to(backdrop, { autoAlpha: 0, duration: CLOSE_DUR, ease: CLOSE_EASE }, "<");
      }
      tweenRef.current = tl;
    },
    []
  );

  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      if (overlayRef.current) gsap.set(overlayRef.current, { visibility: "visible" });
      requestAnimationFrame(() => playOpen());
      return;
    }
    playClose(() => setMounted(false));
  }, [open, mounted, playClose, playOpen]);

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
            <button type="button" className="portal-modal-close" onClick={handleClose} aria-label={t("common.close")}>
              ×
            </button>
          </div>
          <div className="portal-modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
};
