import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  title: string;
  titleId?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export const CampaignCenterModal: React.FC<Props> = ({
  open,
  title,
  titleId = "campaign-center-modal-title",
  onClose,
  children,
}) => {
  const { t } = useTranslation("campaign.player");

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
    <div className="campaign-center-modal" role="presentation">
      <button
        type="button"
        className="campaign-center-modal__backdrop"
        aria-label={t("modal.closeBackdrop")}
        onClick={onClose}
      />
      <section
        className="campaign-center-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="campaign-center-modal__head">
          <h2 id={titleId} className="campaign-center-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="campaign-center-modal__close"
            aria-label={t("modal.close")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="campaign-center-modal__body">{children}</div>
      </section>
    </div>,
    document.body
  );
};
