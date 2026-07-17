import React, { useEffect } from "react";

import { PageProp } from "host/RenderApp";
import {
  LEGACY_CAMPAIGN_MERCHANT_PATH,
  partnerOperationHref,
} from "component/lobby/partner/partnerPaths";

/**
 * Compat: `/campaign/merchant` → `/partner/operation` (query preserved).
 */
const CampaignMerchantLegacyRedirectPage: React.FC<PageProp> = ({ visible }) => {
  useEffect(() => {
    if (visible === 0) return;
    if (typeof window === "undefined") return;
    const { pathname, search } = window.location;
    if (!pathname.startsWith(LEGACY_CAMPAIGN_MERCHANT_PATH)) return;
    const next = partnerOperationHref(search);
    window.location.replace(next);
  }, [visible]);

  if (visible === 0) return null;
  return null;
};

export default CampaignMerchantLegacyRedirectPage;
