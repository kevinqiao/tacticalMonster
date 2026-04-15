import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";

type BootPhase = "checking_session" | "loading_shell" | "ready";

const TEXT_FADE_MS = 320;
const BACKDROP_FADE_MS = 180;

/**
 * 启动遮罩：会话判定 → 顶层页面容器挂载（containersLoaded）。
 * 就绪后先淡出文案，再对**整层**（含黑底）做 opacity 淡出，背景渐变消失而非瞬间卸载。
 * 淡出过程中会短暂透出下层；依赖大厅/壳层与 #000 接近以避免明显闪屏。
 */
const STATIC_BOOT_COVER_ID = "static-boot-cover";

const BootLoadingOverlay: React.FC = () => {
  const { user } = useUserManager();
  const { containersLoaded } = usePageManager();
  const [unmounted, setUnmounted] = useState(false);
  const [textFadeOut, setTextFadeOut] = useState(false);
  const [backdropFadeOut, setBackdropFadeOut] = useState(false);
  const labelRef = useRef({ primary: "", secondary: "" });

  /** 移除静态黑层：三帧后再删 */
  useLayoutEffect(() => {
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(STATIC_BOOT_COVER_ID)?.remove();
        });
      });
    });
    return () => cancelAnimationFrame(outer);
  }, []);

  const phase: BootPhase = useMemo(() => {
    if (user === null) return "checking_session";
    if (containersLoaded !== 1) return "loading_shell";
    return "ready";
  }, [user, containersLoaded]);

  const label = useMemo(() => {
    if (phase === "checking_session") {
      return { primary: "验证会话…", secondary: "Checking session…" };
    }
    if (phase === "loading_shell") {
      return { primary: "加载界面…", secondary: "Loading…" };
    }
    return { primary: "", secondary: "" };
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

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={phase !== "ready"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1500,
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
};

export default BootLoadingOverlay;
