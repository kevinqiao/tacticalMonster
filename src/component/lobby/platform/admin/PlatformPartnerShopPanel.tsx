import React from "react";

import PartnerAdminShopPanel from "../../partner/admin/PartnerAdminShopPanel";

type Props = {
  partnerId: number;
  canEdit: boolean;
};

/**
 * Platform operators use the same Portal-backed Partner SKU actions. The SSO
 * authorization predicate explicitly permits platform operators, so this does
 * not duplicate or bypass the Partner Admin permission path.
 */
const PlatformPartnerShopPanel: React.FC<Props> = ({ partnerId, canEdit }) => {
  if (!canEdit) return <p className="merchant-note">仅 platform admin / owner 可配置商店 SKU。</p>;
  return <PartnerAdminShopPanel partnerId={partnerId} />;
};

export default PlatformPartnerShopPanel;
