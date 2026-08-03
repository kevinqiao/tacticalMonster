import React from "react";

import PartnerAdminTeamModal from "../../partner/admin/PartnerAdminTeamModal";

type Props = {
  partnerId: number;
  partnerName: string;
  onClose: () => void;
  campaignOps?: boolean;
};

/** Platform Admin team modal — same shell as Partner Admin (incl. stores when campaignOps). */
const PlatformPartnerTeamModal: React.FC<Props> = (props) => (
  <PartnerAdminTeamModal {...props} />
);

export default PlatformPartnerTeamModal;
