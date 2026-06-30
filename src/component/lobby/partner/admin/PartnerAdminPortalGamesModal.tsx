import React from "react";

import PartnerAdminFormModal from "./PartnerAdminFormModal";
import PartnerAdminPortalGamesPanel from "./PartnerAdminPortalGamesPanel";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

const PartnerAdminPortalGamesModal: React.FC<Props> = ({ partnerId, partnerName, onClose }) => (
  <PartnerAdminFormModal
    title={`${partnerName} · Portal games (PID ${partnerId})`}
    ariaLabel="Partner portal games"
    onClose={onClose}
    footer={
      <div className="merchant-form-modal__actions">
        <button type="button" className="merchant-btn" onClick={onClose}>
          Close
        </button>
      </div>
    }
  >
    <PartnerAdminPortalGamesPanel partnerId={partnerId} />
  </PartnerAdminFormModal>
);

export default PartnerAdminPortalGamesModal;
