import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const BOOT_SHADOW_CSS = `
:host {
  position: fixed;
  inset: 0;
  z-index: 500000;
  display: block;
  contain: strict;
  isolation: isolate;
  pointer-events: auto;
}
.shell {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #3a6f63;
  color: #ffffff;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  text-align: center;
  transform: none;
  zoom: 1;
}
.text-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.primary {
  font-size: 18px !important;
  line-height: 1.35 !important;
  font-weight: 400 !important;
  text-shadow: none !important;
  letter-spacing: normal !important;
  -webkit-text-stroke: 0 !important;
  transform: none !important;
}
.secondary {
  font-size: 14px !important;
  line-height: 1.35 !important;
  font-weight: 400 !important;
  text-shadow: none !important;
  letter-spacing: normal !important;
  opacity: 0.75;
  transform: none !important;
}
`;

/** 启动遮罩 Shadow 隔离：外部 CSS 无法影响字号/阴影 */
export function BootLoadingShadowHost({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mountEl, setMountEl] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = BOOT_SHADOW_CSS;
    shadow.appendChild(style);

    const mount = document.createElement("div");
    mount.className = "shell";
    shadow.appendChild(mount);
    setMountEl(mount);
  }, []);

  if (typeof document === "undefined") return null;
  return (
    <div ref={hostRef} id="boot-loading-overlay-host">
      {mountEl ? createPortal(children, mountEl) : null}
    </div>
  );
}
