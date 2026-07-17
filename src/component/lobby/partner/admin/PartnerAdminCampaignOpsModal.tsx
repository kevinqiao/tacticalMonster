import React from "react";

import PartnerAdminCampaignOpsShell from "./PartnerAdminCampaignOpsShell";
import type { PartnerCampaignOpsView } from "./partnerCampaignOpsNav";

type Props = {
  partnerId: number;
  partnerName: string;
  section: PartnerCampaignOpsView;
  onClose: () => void;
  onSectionChange?: (section: PartnerCampaignOpsView) => void;
};

const PartnerAdminCampaignOpsModal: React.FC<Props> = (props) => (
  <PartnerAdminCampaignOpsShell {...props} />
);

export default PartnerAdminCampaignOpsModal;
