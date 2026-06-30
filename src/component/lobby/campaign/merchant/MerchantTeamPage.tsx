import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";
import { useUserManager } from "host/service/UserManager";

import PartnerTeamPanel from "../../partner/shared/PartnerTeamPanel";
import {
  campaignAdminErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";
import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";
import { MerchantCampaignProvider } from "../service/useMerchantCampaignManager";
import { MerchantNavLink } from "./MerchantEmbeddedNavContext";
import { MERCHANT_STAFF_ROLE_OPTIONS, useMerchantTeam } from "./useMerchantTeam";

import "./merchant.css";

function merchantIdFromLocation(): string {
  return new URLSearchParams(window.location.search).get("merchantId") ?? "";
}

export const MerchantTeamInner: React.FC<{
  visible: number;
  merchantId: string;
  embedded?: boolean;
}> = ({ visible, merchantId, embedded }) => {
  const { t } = useTranslation("campaign.merchant");
  const { askAuth } = useUserManager();
  const { team, canManage, addStaff, removeStaff } = useMerchantTeam(merchantId);
  const [note, setNote] = useState<string | null>(null);

  if (visible === 0) return null;

  return (
    <>
      {!embedded ? (
        <nav className="merchant-nav">
          <MerchantNavLink route={{ view: "home" }}>{t("nav.back")}</MerchantNavLink>
        </nav>
      ) : null}

      <h2>{t("team.title")}</h2>
      <p className="merchant-note">{t("team.intro")}</p>

      {!merchantId ? (
        <p className="merchant-note">{t("team.merchantRequired")}</p>
      ) : (
        <>
          <PartnerTeamPanel
            team={team?.members}
            roleOptions={MERCHANT_STAFF_ROLE_OPTIONS}
            canManage={canManage}
            labels={{
              membersTitle: t("team.membersTitle"),
              addTitle: t("team.addTitle"),
              addHint: t("team.addHint"),
              accountIdLabel: t("team.accountIdLabel"),
              passwordLabel: t("team.passwordLabel"),
              roleLabel: t("team.roleLabel"),
              addButton: t("team.addButton"),
              removeButton: t("team.removeButton"),
              loading: t("team.loading"),
              empty: t("team.empty"),
              webAccount: t("team.webAccount"),
              noWebUser: t("team.noWebUser"),
            }}
            onAdd={async (accountId, password, role) => {
              if (!team) {
                askAuth({});
                return;
              }
              try {
                await addStaff(accountId, password, role);
                setNote(campaignSuccessMessage("memberAdded"));
              } catch (e) {
                setNote(campaignAdminErrorMessage(e));
                throw e;
              }
            }}
            onRemove={async (uid) => {
              try {
                await removeStaff(uid);
                setNote(campaignSuccessMessage("memberRemoved"));
              } catch (e) {
                setNote(campaignAdminErrorMessage(e));
                throw e;
              }
            }}
          />
          {!canManage && team ? (
            <p className="merchant-note">{t("team.viewerHint")}</p>
          ) : null}
          {note ? <p className="merchant-note">{note}</p> : null}
        </>
      )}
    </>
  );
};

const MerchantTeamPage: React.FC<PageProp> = ({ visible }) => {
  const merchantId = merchantIdFromLocation();

  if (visible === 0) return null;

  return (
    <MerchantCampaignProvider>
      <div className="merchant-page">
        <MerchantPageToolbar />
        <MerchantTeamInner visible={visible} merchantId={merchantId} />
      </div>
    </MerchantCampaignProvider>
  );
};

export default MerchantTeamPage;
