import React from "react";
import { ConvexProvider } from "convex/react";

import { ssoConvexClient } from "host/service/AppProviders";

import { MerchantBrandSettingsInner } from "../../campaign/merchant/MerchantBrandSettingsPage";
import PartnerAdminFormModal from "./PartnerAdminFormModal";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

/** First-level Partner Admin section — SSO partner.brand SoT. */
const PartnerAdminBrandModal: React.FC<Props> = ({ partnerId, partnerName, onClose }) => (
  <PartnerAdminFormModal
    title={`${partnerName} · 品牌（PID ${partnerId}）`}
    ariaLabel="Partner 品牌"
    onClose={onClose}
    footer={
      <div className="merchant-form-modal__actions">
        <button type="button" className="merchant-btn" onClick={onClose}>
          关闭
        </button>
      </div>
    }
  >
    <ConvexProvider client={ssoConvexClient}>
      <MerchantBrandSettingsInner visible={1} partnerId={partnerId} embedded />
    </ConvexProvider>
  </PartnerAdminFormModal>
);

export default PartnerAdminBrandModal;
