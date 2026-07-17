import React, { useState } from "react";
import { ConvexProvider } from "convex/react";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";
import { ssoConvexClient } from "host/service/AppProviders";
import { useUserManager } from "host/service/UserManager";

import PartnerTeamPanel from "../../partner/shared/PartnerTeamPanel";
import {
  campaignAdminErrorMessage,
  campaignSuccessMessage,
} from "../shared/campaignErrorMessage";
import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";
import { MerchantNavLink } from "./MerchantEmbeddedNavContext";
import { MERCHANT_STAFF_ROLE_OPTIONS, useMerchantTeam } from "./useMerchantTeam";

import "./merchant.css";

function storeIdFromLocation(): string {
  const params = new URLSearchParams(window.location.search);
  // Prefer storeId; accept legacy merchantId query.
  return (params.get("storeId") ?? params.get("merchantId") ?? "").trim();
}

type MerchantTeamInnerProps = {
  visible: number;
  storeId: string;
  embedded?: boolean;
};

const MerchantTeamBody: React.FC<MerchantTeamInnerProps> = ({
  visible,
  storeId,
  embedded,
}) => {
  const { t } = useTranslation("campaign.merchant");
  const { askAuth } = useUserManager();
  const { team, canManage, addStaff, removeStaff } = useMerchantTeam(storeId);
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

      {!storeId ? (
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

/** SSO store team APIs — safe under MerchantCampaignProvider / partner admin shells. */
export const MerchantTeamInner: React.FC<MerchantTeamInnerProps> = (props) => (
  <ConvexProvider client={ssoConvexClient}>
    <MerchantTeamBody {...props} />
  </ConvexProvider>
);

const MerchantTeamPage: React.FC<PageProp> = ({ visible }) => {
  const storeId = storeIdFromLocation();

  if (visible === 0) return null;

  return (
    <div className="merchant-page">
      <MerchantPageToolbar />
      <MerchantTeamInner visible={visible} storeId={storeId} />
    </div>
  );
};

export default MerchantTeamPage;
