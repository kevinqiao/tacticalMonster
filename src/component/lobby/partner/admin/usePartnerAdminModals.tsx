import { useCallback, useState } from "react";

import PartnerAdminAuthChannelsModal from "./PartnerAdminAuthChannelsModal";
import PartnerAdminMerchantModal from "./PartnerAdminMerchantModal";
import PartnerAdminProfileModal from "./PartnerAdminProfileModal";
import PartnerAdminTeamModal from "./PartnerAdminTeamModal";
import PartnerAdminPortalGamesModal from "./PartnerAdminPortalGamesModal";

export type PartnerAdminModalSection = "profile" | "auth" | "team" | "merchant" | "portal";

export type PartnerAdminModalTarget = {
  section: PartnerAdminModalSection;
  partnerId: number;
  partnerName: string;
};

const SECTIONS: PartnerAdminModalSection[] = ["profile", "auth", "team", "merchant", "portal"];

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
      {target.section === "merchant" ? (
        <PartnerAdminMerchantModal
          partnerId={target.partnerId}
          partnerName={target.partnerName}
          onClose={closePartnerModal}
        />
      ) : null}
          {target.section === "portal" ? (
        <PartnerAdminPortalGamesModal
          partnerId={target.partnerId}
          partnerName={target.partnerName}
          onClose={closePartnerModal}
        />
      ) : null}
</>
  ) : null;

  return { partnerModals, openPartnerModal, closePartnerModal };
}

