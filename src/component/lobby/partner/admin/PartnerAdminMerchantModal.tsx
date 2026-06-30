import React from "react";

import PartnerAdminMerchantShell from "./PartnerAdminMerchantShell";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
};

const PartnerAdminMerchantModal: React.FC<Props> = (props) => (
  <PartnerAdminMerchantShell {...props} />
);

export default PartnerAdminMerchantModal;
