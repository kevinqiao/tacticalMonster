import React, { useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";

import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

import { merchantCampaignFns } from "../service/campaignConvexFunctionRefs";
import { useMerchantCampaign } from "../service/useMerchantCampaignManager";
import { CampaignAccountPanel } from "./CampaignAccountPanel";
import { CampaignCenterModal } from "./CampaignCenterModal";

type Props = {
  open: boolean;
  onClose: () => void;
};

type CampaignPlayerProfile = {
  displayName: string | null;
  resolvedDisplayName: string;
  displayNameUpdatedAt: number | null;
  verifiedEmail: string | null;
  verifiedPhone: string | null;
};

export const CampaignAccountSheet: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation("campaign.player");
  const { user } = useUserManager();
  const merchant = useMerchantCampaign();
  const authed = isPlatformAuthed(user);

  const profile = useQuery(
    merchantCampaignFns.getCampaignPlayerProfile,
    open && authed ? {} : "skip"
  ) as CampaignPlayerProfile | null | undefined;

  const onSaveDisplayName = useCallback(
    async (displayName: string) => merchant.updateCampaignDisplayName(displayName),
    [merchant]
  );

  const onSaveContact = useCallback(
    async (args: { verifiedEmail?: string; verifiedPhone?: string }) =>
      merchant.syncCampaignContactProfile(args),
    [merchant]
  );

  return (
    <CampaignCenterModal
      open={open}
      title={t("auth.myAccount")}
      titleId="campaign-account-title"
      onClose={onClose}
    >
      <CampaignAccountPanel
        uid={user?.uid}
        ssoName={user?.name}
        email={user?.email}
        phone={user?.phone}
        verifiedEmail={profile?.verifiedEmail}
        verifiedPhone={profile?.verifiedPhone}
        customDisplayName={profile?.displayName}
        resolvedDisplayName={profile?.resolvedDisplayName}
        onSaveDisplayName={authed ? onSaveDisplayName : undefined}
        onSaveContact={authed ? onSaveContact : undefined}
        onSaved={onClose}
      />
    </CampaignCenterModal>
  );
};
