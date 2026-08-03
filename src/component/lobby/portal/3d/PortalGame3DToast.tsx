import React from "react";
import { createPortal } from "react-dom";

type PortalGame3DToastProps = {
  note: string | null;
};

/** 渲染在 Shadow 外，避免被 contain 裁剪。样式见 portal_3d_modal.css */
export function PortalGame3DToast({ note }: PortalGame3DToastProps) {
  if (!note) return null;

  return createPortal(
    <div className="portal-3d-toast" role="status">
      {note}
    </div>,
    document.body
  );
}
