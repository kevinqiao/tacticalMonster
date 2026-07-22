import React from "react";

import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { usePartnerManager } from "host/service/PartnerManager";

import {
  shouldShowPortalAccountChrome,
  shouldShowPortalAuthMenuActions,
} from "../portalAuthButtonVisible";
import { usePortal } from "../service/usePortalManager";

import { PortalGame3DViewport } from "./PortalGame3DViewport";
import { PortalGame3DInner } from "./PortalGame3DInner";
import { PortalGame3DOverlays } from "./PortalGame3DOverlays";
import { PortalGame3DShadowHost } from "./PortalGame3DShadowHost";
import { PortalGame3DToast } from "./PortalGame3DToast";
import { portalShopHasVisibleSkus } from "./portalShopCatalogFallback";
import { resolvePortal3DHeroLogo } from "./portalGame3DTheme";
import { usePortalGame3DController } from "./usePortalGame3DController";

type PortalGame3DPageProps = {
  visible: number;
};

const PortalGame3DPage: React.FC<PortalGame3DPageProps> = ({ visible }) => {
  const portal = usePortal();
  const { partner, partnerPid } = usePartnerManager();
  const ctrl = usePortalGame3DController({ visible });
  const showAuthMenuActions = shouldShowPortalAuthMenuActions(
    undefined,
    undefined,
    partner?.playerAuth
  );
  const showAuthButton = shouldShowPortalAccountChrome(
    ctrl.authed,
    undefined,
    undefined,
    partner?.playerAuth
  );

  if (!portal.gameType) {
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        无效的游戏类型。请访问 /portal/block_blast 等有效路径。
      </div>
    );
  }

  if (visible === 0) return null;

  const heroLogoUrl = resolvePortal3DHeroLogo(portal.gameType);
  const showShop = portalShopHasVisibleSkus(
    portal.shopCatalog?.skus,
    partnerPid,
    portal.shopCatalog != null
  );

  const modalOpen =
    ctrl.shopModalOpen ||
    ctrl.rulesModalOpen != null ||
    ctrl.panelModal != null ||
    ctrl.giftCardOrdersModalOpen ||
    ctrl.weeklyCloseModalOpen;

  return (
    <>
      <PortalGame3DViewport pageActive={visible > 0} modalOpen={modalOpen}>
        <PortalGame3DShadowHost>
          <PortalGame3DInner
          gameType={portal.gameType}
          heroLogoUrl={heroLogoUrl}
          authed={ctrl.authed}
          tier={ctrl.tierView}
          coinBalance={
            isPlatformAuthed(ctrl.user)
              ? (portal.playerWallet?.coins ??
                  portal.shopCatalog?.coins ??
                  0)
              : null
          }
          ticketBalance={isPlatformAuthed(ctrl.user) ? (portal.replayTokenCount ?? 0) : null}
          joining={ctrl.joining}
          soloJoinBlocked={ctrl.soloJoinBlocked}
          multiJoinBlocked={ctrl.multiJoinBlocked}
          soloOpenAssignment={ctrl.soloOpenAssignment}
          multiOpenAssignment={ctrl.multiOpenAssignment}
          soloPlaysToday={ctrl.soloPlaysToday}
          soloMaxPlaysPerDay={ctrl.soloMaxPlaysPerDay}
          multiPlaysToday={ctrl.multiPlaysToday}
          multiMaxPlaysPerDay={ctrl.multiMaxPlaysPerDay}
          soloDailyExhausted={ctrl.soloDailyExhausted}
          multiDailyExhausted={ctrl.multiDailyExhausted}
          soloTicketEntryAvailable={ctrl.soloTicketEntryAvailable}
          multiTicketEntryAvailable={ctrl.multiTicketEntryAvailable}
          soloTicketEntryPrice={ctrl.soloTicketEntryPrice}
          multiTicketEntryPrice={ctrl.multiTicketEntryPrice}
          soloTicketEntryRemaining={ctrl.soloTicketEntryRemaining}
          multiTicketEntryRemaining={ctrl.multiTicketEntryRemaining}
          queueWaiting={ctrl.queueWaiting}
          weekEndsAt={portal.weekEndsAt}
          onJoin={(mode) => void ctrl.handleJoin(mode)}
          onOpenRules={(anchor) => ctrl.setRulesModalOpen(anchor)}
          onOpenLeaderboard={
            ctrl.authed ? () => ctrl.setPanelModal("lb") : undefined
          }
          onOpenFullHistory={
            ctrl.authed ? () => ctrl.setPanelModal("history") : undefined
          }
          onOpenShop={showShop ? () => ctrl.setShopModalOpen(true) : undefined}
          showShop={showShop}
          onSignIn={ctrl.signIn}
          showAuthButton={showAuthButton}
          showAuthMenuActions={showAuthMenuActions}
          onOpenAccount={() => ctrl.setAccountModalOpen(true)}
          unclaimedRewards={ctrl.unclaimedRewards}
          onOpenUnclaimedRewards={ctrl.openWeeklyCloseModal}
          pageActive={visible > 0}
        />
        </PortalGame3DShadowHost>
      </PortalGame3DViewport>
      <PortalGame3DOverlays
        ctrl={ctrl}
        showAuthMenuActions={showAuthMenuActions}
      />
      <PortalGame3DToast note={ctrl.note} />
    </>
  );
};

export default PortalGame3DPage;
