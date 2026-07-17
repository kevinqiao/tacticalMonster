import React from "react";
import { useTranslation } from "react-i18next";

import { usePartnerManager } from "host/service/PartnerManager";

import WebSignInForm from "../../shared/WebSignInForm";

type MerchantWebSignInFormProps = {
  description?: string;
};

/** Store console: Web-only sign-in (staffGate=merchant → SSO store_staff). */
const MerchantWebSignInForm: React.FC<MerchantWebSignInFormProps> = ({ description }) => {
  const { t } = useTranslation("campaign.merchant");
  const { partnerPid } = usePartnerManager();

  return (
    <WebSignInForm
      staffGate="merchant"
      partnerId={partnerPid}
      title={t("auth.signIn")}
      description={description ?? t("auth.webSignInHint")}
      accountIdLabel="accountId"
      submitLabel={t("auth.signIn")}
    />
  );
};

export default MerchantWebSignInForm;
