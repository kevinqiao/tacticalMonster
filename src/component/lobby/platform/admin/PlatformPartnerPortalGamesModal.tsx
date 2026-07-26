import React, { useEffect } from "react";

import PlatformPartnerLobbiesPanel from "./PlatformPartnerLobbiesPanel";
import { usePartnerPortalConfig } from "./usePlatformAdmin";

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
  const config = usePartnerPortalConfig(partnerId);
  const partnerSlug = config?.partnerSlug ?? config?.portalKey ?? "";

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
            {partnerName} · Game Lobby（PID {partnerId}）
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
          <PlatformPartnerLobbiesPanel
            partnerId={partnerId}
            canEdit={canEdit}
            partnerSlug={partnerSlug}
          />
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
