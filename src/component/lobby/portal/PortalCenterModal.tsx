import React, { useEffect } from "react";

type PortalCenterModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
};

export const PortalCenterModal: React.FC<PortalCenterModalProps> = ({
  open,
  title,
  onClose,
  children,
  wide = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="portal-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="portal-modal-title">
      <button type="button" className="portal-modal-backdrop" aria-label="关闭" onClick={onClose} />
      <div className={`portal-modal-panel${wide ? " portal-modal-panel--wide" : ""}`}>
        <div className="portal-modal-head">
          <h2 id="portal-modal-title">{title}</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="portal-modal-body">{children}</div>
      </div>
    </div>
  );
};
