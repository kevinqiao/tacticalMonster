import React from "react";

import { PortalShopPanel } from "component/lobby/portal/3d/PortalShopPanel";
import { usePortal } from "component/lobby/portal/service/usePortalManager";

import "./townShell.css";

const TownShopTab: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const portal = usePortal();
  const skus = portal.shopCatalog?.skus ?? [];

  return (
    <div className="town-tab-panel">
      <h2>Shop</h2>
      <p>Buy tickets with coins once a day, or coin + ticket packs.</p>
      {skus.length > 0 ? (
        <PortalShopPanel
          coins={portal.playerWallet?.coins ?? 0}
          skus={skus}
          onPurchase={portal.purchasePortalShopSku}
          onStripeCheckout={portal.createStripeCheckout}
          onFeedback={(msg) => msg && onToast(msg)}
        />
      ) : (
        <p className="town-tab-panel__empty">Sign in to browse the shop.</p>
      )}
    </div>
  );
};

export default TownShopTab;
