import React from "react";

import PartnerAdminFormModal from "./PartnerAdminFormModal";
import PartnerAdminProfilePanel from "./PartnerAdminProfilePanel";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

const PartnerAdminProfileModal: React.FC<Props> = ({ partnerId, partnerName, onClose }) => (
  <PartnerAdminFormModal
    title={`${partnerName} · 资料（PID ${partnerId}）`}
    ariaLabel="Partner 资料"
    onClose={onClose}
    footer={
      <div className="merchant-form-modal__actions">
        <button type="button" className="merchant-btn" onClick={onClose}>
          关闭
        </button>
      </div>
    }
  >
    <PartnerAdminProfilePanel partnerId={partnerId} />
  </PartnerAdminFormModal>
);

export default PartnerAdminProfileModal;
