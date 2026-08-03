import React, { useCallback, useMemo } from "react";

import { MerchantEmbeddedNavProvider } from "../../campaign/merchant/MerchantEmbeddedNavContext";
import type { MerchantEmbeddedRoute } from "../../campaign/merchant/merchantEmbeddedNav";
import { MerchantCampaignListInner } from "../../campaign/merchant/MerchantCampaignListPage";
import { MerchantCampaignProvider } from "../../campaign/service/useMerchantCampaignManager";
import PartnerAdminFormModal from "./PartnerAdminFormModal";
import { partnerCampaignOpsTitle, type PartnerCampaignOpsView } from "./partnerCampaignOpsNav";

type Props = {
  partnerId: number;
  partnerName: string;
  section: PartnerCampaignOpsView;
  onClose: () => void;
  /** Kept for call-site compatibility; campaign ops is campaigns-only. */
  onSectionChange?: (section: PartnerCampaignOpsView) => void;
};

/**
 * Partner-scoped campaign ops shell (embedded from /platform/admin or /partner/admin).
 * Campaigns only — voucher SKUs live in 商店; stores/staff live under 团队.
 */
const PartnerAdminCampaignOpsShell: React.FC<Props> = ({
  partnerId,
  partnerName,
  onClose,
}) => {
  const title = useMemo(
    () =>
      partnerCampaignOpsTitle(
        "campaigns",
        `${partnerName} · Campaign Ops（PID ${partnerId}）`
      ),
    [partnerId, partnerName]
  );

  const navigate = useCallback(
    (route: MerchantEmbeddedRoute) => {
      if (route.view === "home") {
        onClose();
        return;
      }
      if (route.view === "redeem") {
        window.location.href = "/partner/operation?view=redeem";
        return;
      }
      if (route.view === "team") {
        onClose();
        return;
      }
    },
    [onClose]
  );

  return (
    <MerchantCampaignProvider>
      <MerchantEmbeddedNavProvider navigate={navigate}>
        <PartnerAdminFormModal
          title={title}
          ariaLabel="Campaign Ops"
          onClose={onClose}
          footer={
            <div className="merchant-form-modal__actions">
              <button type="button" className="merchant-btn" onClick={onClose}>
                关闭
              </button>
            </div>
          }
        >
          <MerchantCampaignListInner visible={1} partnerId={partnerId} embedded />
        </PartnerAdminFormModal>
      </MerchantEmbeddedNavProvider>
    </MerchantCampaignProvider>
  );
};

export default PartnerAdminCampaignOpsShell;
