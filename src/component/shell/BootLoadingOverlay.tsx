import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";

type BootPhase = "checking_session" | "loading_critical_assets" | "ready";

const TEXT_FADE_MS = 320;
const BACKDROP_FADE_MS = 180;

/**
 * **冷启动遮罩**（与 PageHandler / pageOpen 无关）。
 *
 * **不复用 `createPortal(..., document.body)`**：与 `#root` 分离时，在部分浏览器/慢网下拆掉 `#static-boot-cover`
 * 后容易出现长时间只剩 `#root` 黑底的合成间隙；改为挂在 React 树内（仍在 `#root` 下），与页面同源叠层。
 *
 * **`index.html` 的 `#static-boot-cover`**：bundle 下载完成前显示「正在加载应用…」。首帧提交后对静态层 `visibility:hidden` 再延后移除，避免只靠 `remove()` 捅穿叠层。
 *
 * 结束条件：`UserManager` 会话已解析（`user != null`）且 `PageProvider.coldBootAssetsReady`。
 */
const STATIC_BOOT_COVER_ID = "static-boot-cover";

const BOOT_LAYER_Z = 500_000;

const peelStaticBootCover = (): HTMLElement | null => {
  const el = document.getElementById(STATIC_BOOT_COVER_ID);
  if (!el) return null;
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  el.setAttribute("aria-hidden", "true");
  return el;
};

const BootLoadingOverlay: React.FC = () => {
  const { user } = useUserManager();
  const { coldBootAssetsReady } = usePageManager();
  const [unmounted, setUnmounted] = useState(false);
  const [textFadeOut, setTextFadeOut] = useState(false);
  const [backdropFadeOut, setBackdropFadeOut] = useState(false);
  const labelRef = useRef({ primary: "Loading...", secondary: "" });
  const shellRef = useRef<HTMLDivElement | null>(null);

  /** 同步摘掉静态盖层视觉，再异步删 DOM，降低「洞穿」一帧概率 */
  useLayoutEffect(() => {
    if (!shellRef.current) return;
    const staticEl = peelStaticBootCover();
    let cancelled = false;
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (!cancelled) staticEl?.remove();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, []);

  const phase: BootPhase = useMemo(() => {
    if (user == null) return "checking_session";
    if (!coldBootAssetsReady) return "loading_critical_assets";
    return "ready";
  }, [user, coldBootAssetsReady]);

  const label = useMemo(() => {
    if (phase === "checking_session") {
      return { primary: "验证会话…", secondary: "Checking session…" };
    }
    if (phase === "loading_critical_assets") {
      return { primary: "加载关键资源…", secondary: "Loading assets…" };
    }
    return { primary: "Loading...", secondary: "" };
  }, [phase]);

  if (phase !== "ready") {
    labelRef.current = label;
  }

  useLayoutEffect(() => {
    if (phase !== "ready" || unmounted) return;
    const { primary, secondary } = labelRef.current;
    if (!primary && !secondary) {
      setUnmounted(true);
      return;
    }
    const raf = requestAnimationFrame(() => {
      setTextFadeOut(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, unmounted]);

  const onTextTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "opacity") return;
    if (e.target !== e.currentTarget) return;
    if (textFadeOut) setBackdropFadeOut(true);
  };

  const onBackdropTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "opacity") return;
    if (e.target !== e.currentTarget) return;
    if (backdropFadeOut) setUnmounted(true);
  };

  if (unmounted) return null;

  const showText = phase !== "ready" ? label : labelRef.current;

  const overlay = (
    <div
      ref={shellRef}
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
        backgroundColor: "#000000",
        pointerEvents: "auto",
        opacity: backdropFadeOut ? 0 : 1,
        transition: `opacity ${BACKDROP_FADE_MS}ms ease-out`,
      }}
      onTransitionEnd={onBackdropTransitionEnd}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "#ffffff",
          fontSize: 18,
          opacity: textFadeOut ? 0 : 1,
          transition: `opacity ${TEXT_FADE_MS}ms ease-out`,
        }}
        onTransitionEnd={onTextTransitionEnd}
      >
        <span>{showText.primary}</span>
        <span style={{ fontSize: 14, opacity: 0.75 }}>{showText.secondary}</span>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return overlay;
};

export default BootLoadingOverlay;
