import React from "react";
import { createPortal } from "react-dom";

type PortalGame3DToastProps = {
  note: string | null;
};

/** 渲染在 Shadow 外，避免被 contain 裁剪。 */
export function PortalGame3DToast({ note }: PortalGame3DToastProps) {
  if (!note) return null;

  return createPortal(
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "max(24px, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 10050,
        maxWidth: "min(92vw, 420px)",
        padding: "12px 18px",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.92)",
        color: "#f8fafc",
        fontFamily: "Nunito, system-ui, sans-serif",
        fontSize: "14px",
        fontWeight: 800,
        lineHeight: 1.45,
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        pointerEvents: "none",
      }}
    >
      {note}
    </div>,
    document.body
  );
}
