import gsap from "gsap";
import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/** 仅面向手机 / 平板触摸：短、轻缩放、无多层 filter（省 GPU） */
const PRESET = {
  durationShow: 0.24,
  durationShowFill: 0.18,
  durationHide: 0.14,
  easeHide: "power2.in",
  easeShowFill: "power2.out",
  easeShowPop: "power2.out",
  scaleLit: 1.035,
} as const;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type Props = {
  d: string;
  fill: string;
  ariaLabel: string;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<SVGPathElement>) => void;
};

/**
 * SVG 热区（仅触摸设备场景）：GSAP 驱动 fill-opacity + scale；按下微缩。
 */
export const FooterNavHitPath: React.FC<Props> = ({
  d,
  fill,
  ariaLabel,
  onClick,
  onKeyDown,
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const pressTweenRef = useRef<gsap.core.Tween | null>(null);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);

  const killAnim = useCallback(() => {
    timelineRef.current?.kill();
    timelineRef.current = null;
  }, []);

  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    gsap.set(el, {
      transformOrigin: "center center",
      scale: 1,
      attr: { "fill-opacity": "0" },
    });
  }, [d]);

  useEffect(() => {
    return () => {
      killAnim();
      pressTweenRef.current?.kill();
    };
  }, [killAnim]);

  const sync = useCallback(() => {
    const el = pathRef.current;
    if (!el) return;
    const show = hoverRef.current || focusRef.current;
    const reduced = prefersReducedMotion();

    killAnim();

    if (reduced) {
      gsap.set(el, {
        attr: { "fill-opacity": show ? "1" : "0" },
        scale: show ? 1.02 : 1,
      });
      return;
    }

    const p = PRESET;

    if (show) {
      const tl = gsap.timeline();
      timelineRef.current = tl;

      tl.to(
        el,
        {
          attr: { "fill-opacity": "1" },
          duration: p.durationShowFill,
          ease: p.easeShowFill,
        },
        0
      );

      tl.to(
        el,
        {
          scale: p.scaleLit,
          duration: p.durationShow,
          ease: p.easeShowPop,
        },
        0
      );
    } else {
      const tl = gsap.timeline();
      timelineRef.current = tl;

      tl.to(el, {
        attr: { "fill-opacity": "0" },
        scale: 1,
        duration: p.durationHide,
        ease: p.easeHide,
      });
    }
  }, [killAnim]);

  const onPointerDown = useCallback(() => {
    const el = pathRef.current;
    if (!el) return;
    const cur = (Number(gsap.getProperty(el, "scale")) || 1) as number;
    pressTweenRef.current?.kill();
    pressTweenRef.current = gsap.to(el, {
      scale: Math.max(0.9, cur * 0.94),
      duration: 0.08,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, []);

  const onPointerUpOrCancel = useCallback(() => {
    pressTweenRef.current?.kill();
    pressTweenRef.current = null;
    sync();
  }, [sync]);

  return (
    <path
      ref={pathRef}
      className="footer-nav-hit-path"
      d={d}
      fill={fill}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUpOrCancel}
      onPointerCancel={onPointerUpOrCancel}
      onPointerEnter={() => {
        hoverRef.current = true;
        sync();
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
        sync();
      }}
      onFocus={() => {
        focusRef.current = true;
        sync();
      }}
      onBlur={() => {
        focusRef.current = false;
        sync();
      }}
    />
  );
};
