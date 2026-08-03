import React from "react";

import { PortalAccountSheet } from "@/component/lobby/portal/3d/PortalAccountSheet";
import { PortalDocumentStylesProvider } from "@/component/lobby/portal/usePortalDocumentStyles";

type Props = {
  open: boolean;
  onClose: () => void;
  onSignOut?: () => void;
};

/**
 * Campaign landing account sheet — Portal profile + vouchers (+ QR redeem).
 * Requires an ancestor PortalProvider (see CampaignMerchantCarousel / CampaignLandingSingle).
 */
export const CampaignAccountSheet: React.FC<Props> = ({ open, onClose, onSignOut }) => (
  <PortalDocumentStylesProvider>
    <PortalAccountSheet
      open={open}
      onClose={onClose}
      onSignOut={onSignOut}
      showSignOut
    />
  </PortalDocumentStylesProvider>
);
