import React, { useEffect } from "react";

import PlatformPartnerPortalGamesPanel from "./PlatformPartnerPortalGamesPanel";
import PlatformPartnerShopPanel from "./PlatformPartnerShopPanel";

import "../../campaign/merchant/merchant.css";

type Props = {
  partnerId: number;
  partnerName: string;
  canEdit: boolean;
  onClose: () => void;
};

const PlatformPartnerPortalGamesModal: React.FC<Props> = ({
  partnerId,
  partnerName,
  canEdit,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="merchant-form-modal" role="dialog" aria-modal="true">
      <div className="merchant-form-modal__panel">
        <header className="merchant-form-modal__head">
          <h2 className="merchant-form-modal__title">
            {partnerName} · Portal 游戏授权（PID {partnerId}）
          </h2>
          <button
            type="button"
            className="merchant-form-modal__close"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="merchant-form-modal__body">
          <PlatformPartnerPortalGamesPanel partnerId={partnerId} canEdit={canEdit} />
          <hr />
          <h3>Partner 专属商店 SKU</h3>
          <PlatformPartnerShopPanel partnerId={partnerId} canEdit={canEdit} />
        </div>
        <footer className="merchant-form-modal__footer">
          <div className="merchant-form-modal__actions">
            <button type="button" className="merchant-btn" onClick={onClose}>
              关闭
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PlatformPartnerPortalGamesModal;
