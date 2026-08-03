import React, { useState } from "react";
import { ConvexProvider } from "convex/react";

import { ssoConvexClient } from "host/service/AppProviders";
import { MerchantTeamInner } from "../../campaign/merchant/MerchantTeamPage";
import { PartnerStoresInner } from "./PartnerStoresPage";

type Props = {
  partnerId: number;
  /** Stores require campaignOps (SSO storeAdmin gate). */
  campaignOps?: boolean;
};

type StoreTeamCtx = { storeId: string; name: string };

/**
 * Stores + store staff, embedded under Partner/Platform「团队」.
 * Not a top-level campaign-ops section.
 */
const PartnerTeamStoresBlock: React.FC<Props> = ({ partnerId, campaignOps = false }) => {
  const [storeTeam, setStoreTeam] = useState<StoreTeamCtx | null>(null);

  if (!campaignOps) return null;

  if (storeTeam) {
    return (
      <section style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          className="merchant-link-btn"
          style={{ marginBottom: 12 }}
          onClick={() => setStoreTeam(null)}
        >
          ← 返回门店
        </button>
        <h3 className="merchant-section-title">门店员工 · {storeTeam.name}</h3>
        <ConvexProvider client={ssoConvexClient}>
          <MerchantTeamInner visible={1} storeId={storeTeam.storeId} embedded />
        </ConvexProvider>
      </section>
    );
  }

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h3 className="merchant-section-title">门店</h3>
      <PartnerStoresInner
        partnerId={partnerId}
        embedded
        onManageStoreTeam={setStoreTeam}
      />
    </section>
  );
};

export default PartnerTeamStoresBlock;
