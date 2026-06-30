import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { MerchantEmbeddedNavProvider } from "../../campaign/merchant/MerchantEmbeddedNavContext";
import {
  MerchantShellBody,
  merchantShellTitle,
  useMerchantShellStack,
} from "../../campaign/merchant/merchantShellNavigation";
import { MerchantCampaignProvider } from "../../campaign/service/useMerchantCampaignManager";
import PartnerAdminFormModal from "./PartnerAdminFormModal";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

const PartnerAdminMerchantShell: React.FC<Props> = ({ partnerId, partnerName, onClose }) => {
  const { t } = useTranslation("campaign.merchant");
  const { current, navigate, goBack, canGoBack } = useMerchantShellStack();

  const handleEscape = useCallback(() => {
    if (canGoBack) {
      goBack();
      return true;
    }
    return false;
  }, [canGoBack, goBack]);

  const title = useMemo(
    () =>
      merchantShellTitle(current, t, {
        prefix: `${partnerName} · 商户 Campaign（PID ${partnerId}）`,
      }),
    [current, partnerId, partnerName, t]
  );

  return (
    <MerchantCampaignProvider>
      <MerchantEmbeddedNavProvider navigate={navigate}>
        <PartnerAdminFormModal
          title={title}
          ariaLabel="商户管理"
          onClose={onClose}
          onBack={canGoBack ? goBack : undefined}
          onEscape={handleEscape}
          footer={
            <div className="merchant-form-modal__actions">
              <button type="button" className="merchant-btn" onClick={onClose}>
                关闭
              </button>
            </div>
          }
        >
          <MerchantShellBody current={current} embedded />
        </PartnerAdminFormModal>
      </MerchantEmbeddedNavProvider>
    </MerchantCampaignProvider>
  );
};

export default PartnerAdminMerchantShell;
