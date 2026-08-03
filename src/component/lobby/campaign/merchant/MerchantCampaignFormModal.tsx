import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  title: string;
  titleId?: string;
  onClose: () => void;
  statusNote?: string | null;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export const MerchantCampaignFormModal: React.FC<Props> = ({
  open,
  title,
  titleId = "merchant-campaign-form-modal-title",
  onClose,
  statusNote,
  footer,
  children,
}) => {
  const { t } = useTranslation("campaign.merchant");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="merchant-form-modal" role="presentation">
      <section
        className="merchant-form-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="merchant-form-modal__head">
          <div className="merchant-form-modal__leading" aria-hidden="true" />
          <h2 id={titleId} className="merchant-form-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="merchant-form-modal__close"
            aria-label={t("modal.close")}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="merchant-form-modal__body">{children}</div>

        <footer className="merchant-form-modal__footer">
          {statusNote ? (
            <p className="merchant-note merchant-note--status merchant-form-modal__status">{statusNote}</p>
          ) : null}
          <div className="merchant-form-modal__actions">{footer}</div>
        </footer>
      </section>
    </div>,
    document.body
  );
};
