import { useCallback, useState } from "react";

import PartnerAdminAuthChannelsModal from "./PartnerAdminAuthChannelsModal";
import PartnerAdminBrandModal from "./PartnerAdminBrandModal";
import PartnerAdminCampaignOpsModal from "./PartnerAdminCampaignOpsModal";
import PartnerAdminProfileModal from "./PartnerAdminProfileModal";
import PartnerAdminRedeemPanel from "./PartnerAdminRedeemPanel";
import PartnerAdminShopPanel from "./PartnerAdminShopPanel";
import PartnerAdminTeamModal from "./PartnerAdminTeamModal";
import PartnerAdminFormModal from "./PartnerAdminFormModal";
import type { PartnerCampaignOpsView } from "./partnerCampaignOpsNav";
import type { PartnerAdminSection } from "./PartnerAdminPartnerNav";

export type PartnerAdminModalSection = PartnerAdminSection;

export type PartnerAdminModalTarget = {
  section: PartnerAdminModalSection;
  partnerId: number;
  partnerName: string;
  campaignOps?: boolean;
};

const BASE_SECTIONS: PartnerAdminModalSection[] = [
  "profile",
  "auth",
  "team",
  "brand",
  "shop",
  "redeem",
];
const CAMPAIGN_OPS_SECTIONS: PartnerCampaignOpsView[] = ["campaigns"];
const SECTIONS: PartnerAdminModalSection[] = [...BASE_SECTIONS, ...CAMPAIGN_OPS_SECTIONS];

function isCampaignOpsSection(value: string): value is PartnerCampaignOpsView {
  return (CAMPAIGN_OPS_SECTIONS as readonly string[]).includes(value);
}

export function isPartnerAdminModalSection(value: string | null): value is PartnerAdminModalSection {
  return value !== null && SECTIONS.includes(value as PartnerAdminModalSection);
}

export function usePartnerAdminModals() {
  const [target, setTarget] = useState<PartnerAdminModalTarget | null>(null);

  const openPartnerModal = useCallback(
    (
      section: PartnerAdminModalSection,
      partnerId: number,
      partnerName: string,
      opts?: { campaignOps?: boolean }
    ) => {
      setTarget({
        section,
        partnerId,
        partnerName,
        campaignOps: opts?.campaignOps,
      });
    },
    []
  );

  const closePartnerModal = useCallback(() => {
    setTarget(null);
  }, []);

  const partnerModals = target ? (
    <>
      {target.section === "profile" ? (
        <PartnerAdminProfileModal
          partnerId={target.partnerId}
          partnerName={target.partnerName}
          onClose={closePartnerModal}
        />
      ) : null}
      {target.section === "auth" ? (
        <PartnerAdminAuthChannelsModal
          partnerId={target.partnerId}
          partnerName={target.partnerName}
          onClose={closePartnerModal}
        />
      ) : null}
      {target.section === "team" ? (
        <PartnerAdminTeamModal
          partnerId={target.partnerId}
          partnerName={target.partnerName}
          campaignOps={target.campaignOps === true}
          onClose={closePartnerModal}
        />
      ) : null}
      {target.section === "brand" ? (
        <PartnerAdminBrandModal
          partnerId={target.partnerId}
          partnerName={target.partnerName}
          onClose={closePartnerModal}
        />
      ) : null}
      {target.section === "redeem" ? (
        <PartnerAdminFormModal
          title={`${target.partnerName} · 核销`}
          ariaLabel="兑换券核销"
          onClose={closePartnerModal}
        >
          <PartnerAdminRedeemPanel partnerId={target.partnerId} />
        </PartnerAdminFormModal>
      ) : null}
      {target.section === "shop" ? (
        <PartnerAdminFormModal
          title={`${target.partnerName} · 商店`}
          ariaLabel="商店 SKU 配置"
          onClose={closePartnerModal}
        >
          <PartnerAdminShopPanel partnerId={target.partnerId} />
        </PartnerAdminFormModal>
      ) : null}
      {isCampaignOpsSection(target.section) ? (
        <PartnerAdminCampaignOpsModal
          partnerId={target.partnerId}
          partnerName={target.partnerName}
          section={target.section}
          onClose={closePartnerModal}
          onSectionChange={(section) =>
            setTarget((prev) => (prev ? { ...prev, section } : prev))
          }
        />
      ) : null}
    </>
  ) : null;

  return { partnerModals, openPartnerModal, closePartnerModal };
}
