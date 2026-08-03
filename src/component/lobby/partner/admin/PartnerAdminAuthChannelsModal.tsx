import React from "react";

import PartnerAdminAuthChannelsPanel from "./PartnerAdminAuthChannelsPanel";
import PartnerAdminFormModal from "./PartnerAdminFormModal";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

const PartnerAdminAuthChannelsModal: React.FC<Props> = ({ partnerId, partnerName, onClose }) => (
  <PartnerAdminFormModal
    title={`${partnerName} · 登录配置（PID ${partnerId}）`}
    ariaLabel="Partner 登录配置"
    onClose={onClose}
    footer={
      <div className="merchant-form-modal__actions">
        <button type="button" className="merchant-btn" onClick={onClose}>
          关闭
        </button>
      </div>
    }
  >
    <PartnerAdminAuthChannelsPanel partnerId={partnerId} />
  </PartnerAdminFormModal>
);

export default PartnerAdminAuthChannelsModal;
