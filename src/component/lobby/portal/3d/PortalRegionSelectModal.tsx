import React, { useState } from "react";
import { useTranslation } from "react-i18next";

const REGION_CODES = ["US", "CA", "GB", "EU"] as const;

type PortalRegionSelectModalProps = {
  open: boolean;
  onConfirm: (region: string) => void;
  onClose: () => void;
};

export function PortalRegionSelectModal({
  open,
  onConfirm,
  onClose,
}: PortalRegionSelectModalProps) {
  const { t } = useTranslation("portal.player");
  const [region, setRegion] = useState("US");

  if (!open) return null;

  return (
    <div className="portal-region-modal" role="dialog" aria-modal="true">
      <div className="portal-region-modal__card">
        <h3 className="portal-region-modal__title">{t("regions.title")}</h3>
        <p className="portal-region-modal__hint">{t("regions.hint")}</p>
        <select
          className="portal-region-modal__select"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          {REGION_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`regions.${code}`)}
            </option>
          ))}
        </select>
        <div className="portal-region-modal__actions">
          <button type="button" className="portal-region-modal__btn" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="portal-region-modal__btn portal-region-modal__btn--primary"
            onClick={() => onConfirm(region)}
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
