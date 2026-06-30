import React from "react";
import { useTranslation } from "react-i18next";

import { usePartnerManager } from "host/service/PartnerManager";

import WebSignInForm from "../../shared/WebSignInForm";

/** Merchant console: Web-only sign-in (staffGate=merchant → SSO + merchant_staff bridge). */
const MerchantWebSignInForm: React.FC = () => {
  const { t } = useTranslation("campaign.merchant");
  const { partnerPid } = usePartnerManager();

  return (
    <WebSignInForm
      staffGate="merchant"
      partnerId={partnerPid}
      title={t("auth.signIn")}
      description={t("auth.webSignInHint")}
      accountIdLabel="accountId"
      submitLabel={t("auth.signIn")}
    />
  );
};

export default MerchantWebSignInForm;
