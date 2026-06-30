import React, { useEffect } from "react";

import "../../campaign/merchant/merchant.css";

type PartnerAdminFormModalProps = {
  title: string;
  ariaLabel: string;
  onClose: () => void;
  onBack?: () => void;
  /** Return true to prevent closing the modal on Escape. */
  onEscape?: () => boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const PartnerAdminFormModal: React.FC<PartnerAdminFormModalProps> = ({
  title,
  ariaLabel,
  onClose,
  onBack,
  onEscape,
  children,
  footer,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (onEscape?.()) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onEscape]);

  return (
    <div className="merchant-form-modal" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="merchant-form-modal__panel">
        <header className="merchant-form-modal__head">
          <div className="merchant-form-modal__leading">
            {onBack ? (
              <button
                type="button"
                className="merchant-link-btn merchant-form-modal__back"
                aria-label="返回"
                onClick={onBack}
              >
                ← 返回
              </button>
            ) : null}
          </div>
          <h2 className="merchant-form-modal__title">{title}</h2>
          <button
            type="button"
            className="merchant-form-modal__close"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="merchant-form-modal__body">{children}</div>

        {footer ? <footer className="merchant-form-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
};

export default PartnerAdminFormModal;
