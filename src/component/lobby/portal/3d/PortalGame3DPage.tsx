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

  if (visible === 0) return null;

  // Multi-game lobby may have null gameType until the player picks a ticket.
  const heroLogoUrl = resolvePortal3DHeroLogo(portal.gameType);
  const showShopCatalog = portalShopHasVisibleSkus(
    portal.shopCatalog?.skus,
    partnerPid,
    portal.shopCatalog != null
  );
  const showShop = showShopCatalog || ctrl.adCoinClientEnabled;
  const authed = isPlatformAuthed(ctrl.user);
  const coinBalanceRaw =
    portal.playerWallet?.coins ?? portal.shopCatalog?.coins ?? 0;
  const ticketBalanceRaw = portal.replayTokenCount ?? 0;
  // Hide top-left chips when balance is zero.
  const coinBalance = authed && coinBalanceRaw > 0 ? coinBalanceRaw : null;
  const ticketBalance = authed && ticketBalanceRaw > 0 ? ticketBalanceRaw : null;

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
          coinBalance={coinBalance}
          ticketBalance={ticketBalance}
          joining={ctrl.joining}
          soloJoinBlocked={ctrl.soloJoinBlocked}
          multiJoinBlocked={ctrl.multiJoinBlocked}
          soloOpenAssignment={ctrl.soloOpenAssignment}
          multiOpenAssignment={ctrl.multiOpenAssignment}
          soloLadderPlaysToday={ctrl.soloLadderPlaysToday}
          soloMaxPlaysPerDay={ctrl.soloMaxPlaysPerDay}
          soloSuccessEnabled={ctrl.soloSuccessEnabled}
          soloSuccessUsedToday={ctrl.soloSuccessUsedToday}
          soloSuccessDailyCap={ctrl.soloSuccessDailyCap}
          multiLadderPlaysToday={ctrl.multiLadderPlaysToday}
          multiMaxPlaysPerDay={ctrl.multiMaxPlaysPerDay}
          soloDailyExhausted={ctrl.soloDailyExhausted}
          multiDailyExhausted={ctrl.multiDailyExhausted}
          soloAdEntryAvailable={ctrl.soloAdEntryAvailable}
          multiAdEntryAvailable={ctrl.multiAdEntryAvailable}
          soloAdEntryEnabled={ctrl.soloAdEntryEnabled}
          multiAdEntryEnabled={ctrl.multiAdEntryEnabled}
          soloAdEntryUsedToday={ctrl.soloAdEntryUsedToday}
          multiAdEntryUsedToday={ctrl.multiAdEntryUsedToday}
          soloAdEntryCap={ctrl.soloAdEntryCap}
          multiAdEntryCap={ctrl.multiAdEntryCap}
          soloTicketEntryAvailable={ctrl.soloTicketEntryAvailable}
          multiTicketEntryAvailable={ctrl.multiTicketEntryAvailable}
          soloTicketEntryPrice={ctrl.soloTicketEntryPrice}
          multiTicketEntryPrice={ctrl.multiTicketEntryPrice}
          soloTicketEntryRemaining={ctrl.soloTicketEntryRemaining}
          multiTicketEntryRemaining={ctrl.multiTicketEntryRemaining}
          soloShowHomeLadderCta={ctrl.soloShowHomeLadderCta}
          multiShowHomeLadderCta={ctrl.multiShowHomeLadderCta}
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
          onOpenBadges={ctrl.openAccountBadges}
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
