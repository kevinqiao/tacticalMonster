import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConvexProvider } from "convex/react";

import { ssoConvexClient } from "host/service/AppProviders";
import { MerchantEmbeddedNavProvider } from "../../campaign/merchant/MerchantEmbeddedNavContext";
import type { MerchantEmbeddedRoute } from "../../campaign/merchant/merchantEmbeddedNav";
import { MerchantCampaignListInner } from "../../campaign/merchant/MerchantCampaignListPage";
import { MerchantCouponDefListInner } from "../../campaign/merchant/MerchantCouponDefListPage";
import { MerchantCouponListInner } from "../../campaign/merchant/MerchantCouponListPage";
import { MerchantTeamInner } from "../../campaign/merchant/MerchantTeamPage";
import { MerchantCampaignProvider } from "../../campaign/service/useMerchantCampaignManager";
import PartnerAdminFormModal from "./PartnerAdminFormModal";
import {
  partnerCampaignOpsTitle,
  type PartnerCampaignOpsView,
} from "./partnerCampaignOpsNav";
import { PartnerStoresInner } from "./PartnerStoresPage";

type Props = {
  partnerId: number;
  partnerName: string;
  section: PartnerCampaignOpsView;
  onClose: () => void;
  /** Switch campaign-ops section without unmounting the modal host. */
  onSectionChange?: (section: PartnerCampaignOpsView) => void;
};

type StoreTeamCtx = { storeId: string; name: string };

const CAMPAIGN_OPS_VIEWS = new Set<string>([
  "campaigns",
  "coupon-defs",
  "coupons",
  "stores",
  "store-team",
]);

/** Stores/team use SSO (not Campaign Convex). Brand is a first-level Partner Admin section. */
const SSO_SECTIONS = new Set<PartnerCampaignOpsView>(["stores", "store-team"]);

/**
 * Partner-scoped campaign ops shell.
 * Provides MerchantEmbeddedNav so in-modal links stay on Partner Admin (not /partner/operation).
 */
const PartnerAdminCampaignOpsShell: React.FC<Props> = ({
  partnerId,
  partnerName,
  section: sectionProp,
  onClose,
  onSectionChange,
}) => {
  const [sectionLocal, setSectionLocal] = useState(sectionProp);
  const [storeTeam, setStoreTeam] = useState<StoreTeamCtx | null>(null);
  const controlled = Boolean(onSectionChange);
  const section = controlled ? sectionProp : sectionLocal;

  useEffect(() => {
    if (!controlled) setSectionLocal(sectionProp);
  }, [controlled, sectionProp]);

  useEffect(() => {
    if (section !== "store-team") setStoreTeam(null);
  }, [section]);

  const setSection = useCallback(
    (next: PartnerCampaignOpsView) => {
      if (onSectionChange) onSectionChange(next);
      else setSectionLocal(next);
    },
    [onSectionChange]
  );

  const openStoreTeam = useCallback(
    (store: StoreTeamCtx) => {
      setStoreTeam(store);
      setSection("store-team");
    },
    [setSection]
  );

  const title = useMemo(
    () =>
      partnerCampaignOpsTitle(
        section,
        `${partnerName} · Campaign Ops（PID ${partnerId}）`,
        storeTeam?.name
      ),
    [partnerId, partnerName, section, storeTeam?.name]
  );

  const navigate = useCallback(
    (route: MerchantEmbeddedRoute) => {
      if (route.view === "home") {
        onClose();
        return;
      }
      if (route.view === "redeem") {
        window.location.href = "/partner/operation?view=redeem";
        return;
      }
      if (route.view === "team") {
        openStoreTeam({
          storeId: route.storeId,
          name: route.storeName ?? route.storeId,
        });
        return;
      }
      if (CAMPAIGN_OPS_VIEWS.has(route.view)) {
        setSection(route.view as PartnerCampaignOpsView);
      }
    },
    [onClose, openStoreTeam, setSection]
  );

  const body = useMemo(() => {
    switch (section) {
      case "campaigns":
        return (
          <MerchantCampaignListInner visible={1} partnerId={partnerId} embedded />
        );
      case "coupon-defs":
        return (
          <MerchantCouponDefListInner visible={1} partnerId={partnerId} embedded />
        );
      case "coupons":
        return (
          <MerchantCouponListInner
            visible={1}
            partnerId={partnerId}
            campaignId=""
            embedded
          />
        );
      case "stores":
        return (
          <PartnerStoresInner
            partnerId={partnerId}
            embedded
            onManageStoreTeam={openStoreTeam}
          />
        );
      case "store-team":
        if (!storeTeam) {
          return (
            <PartnerStoresInner
              partnerId={partnerId}
              embedded
              onManageStoreTeam={openStoreTeam}
            />
          );
        }
        return (
          <ConvexProvider client={ssoConvexClient}>
            <button
              type="button"
              className="merchant-link-btn"
              style={{ marginBottom: 12 }}
              onClick={() => setSection("stores")}
            >
              ← 返回门店
            </button>
            <MerchantTeamInner visible={1} storeId={storeTeam.storeId} embedded />
          </ConvexProvider>
        );
    }
  }, [openStoreTeam, partnerId, section, setSection, storeTeam]);

  const modal = (
    <MerchantEmbeddedNavProvider navigate={navigate}>
      <PartnerAdminFormModal
        title={title}
        ariaLabel="Campaign Ops"
        onClose={onClose}
        footer={
          <div className="merchant-form-modal__actions">
            <nav className="merchant-nav" style={{ flex: 1 }}>
              {(
                [
                  ["campaigns", "活动"],
                  ["coupon-defs", "券定义"],
                  ["coupons", "券实例"],
                  ["stores", "门店"],
                ] as const
              ).map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  className="merchant-link-btn"
                  disabled={section === view || (view === "stores" && section === "store-team")}
                  onClick={() => setSection(view)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <button type="button" className="merchant-btn" onClick={onClose}>
              关闭
            </button>
          </div>
        }
      >
        {body}
      </PartnerAdminFormModal>
    </MerchantEmbeddedNavProvider>
  );

  if (SSO_SECTIONS.has(section)) {
    return modal;
  }

  return <MerchantCampaignProvider>{modal}</MerchantCampaignProvider>;
};

export default PartnerAdminCampaignOpsShell;
