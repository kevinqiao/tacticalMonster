import { useCallback, useState } from "react";

import PartnerAdminAuthChannelsModal from "./PartnerAdminAuthChannelsModal";
import PartnerAdminCampaignOpsModal from "./PartnerAdminCampaignOpsModal";
import PartnerAdminProfileModal from "./PartnerAdminProfileModal";
import PartnerAdminTeamModal from "./PartnerAdminTeamModal";
import type { PartnerCampaignOpsView } from "./partnerCampaignOpsNav";
import type { PartnerAdminSection } from "./PartnerAdminPartnerNav";

export type PartnerAdminModalSection = PartnerAdminSection;

export type PartnerAdminModalTarget = {
  section: PartnerAdminModalSection;
  partnerId: number;
  partnerName: string;
};

const BASE_SECTIONS: PartnerAdminModalSection[] = ["profile", "auth", "team"];
const CAMPAIGN_OPS_SECTIONS: PartnerCampaignOpsView[] = [
  "campaigns",
  "coupon-defs",
  "coupons",
  "brand",
  "stores",
  "store-team",
];
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
    (section: PartnerAdminModalSection, partnerId: number, partnerName: string) => {
      setTarget({ section, partnerId, partnerName });
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
          onClose={closePartnerModal}
        />
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
