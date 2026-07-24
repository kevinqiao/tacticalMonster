import React from "react";
import { useTranslation } from "react-i18next";

import { usePartnerManager } from "host/service/PartnerManager";
import { useModalManager } from "host/service/ModalManager";

import CasualPlayMatchOverlay from "../../casual/view/play/CasualPlayMatchOverlay";
import { PortalCenterModal } from "../PortalCenterModal";
import {
  PortalHistoryList,
  PortalWeeklyLeaderboardPanel,
} from "../PortalPanels";
import { PortalHistoryReportOverlays } from "../PortalHistoryReportOverlays";
import { PortalRulesContent } from "./PortalRulesContent";
import { PortalGiftCardPanel } from "./PortalGiftCardPanel";
import { PortalShopPanel } from "./PortalShopPanel";
import { PortalAccountSheet } from "./PortalAccountSheet";
import {
  resolvePortalShopSkus,
} from "./portalShopCatalogFallback";
import { PortalWeeklyLeagueClosePanel } from "./PortalWeeklyLeagueClosePanel";
import type { PortalTierId } from "./portalGame3DTheme";

import type { usePortalGame3DController } from "./usePortalGame3DController";

type Controller = ReturnType<typeof usePortalGame3DController>;

type PortalGame3DOverlaysProps = {
  ctrl: Controller;
  /** Show Sign Out inside the account modal (first-party only). */
  showAuthMenuActions?: boolean;
};

export function PortalGame3DOverlays({
  ctrl,
  showAuthMenuActions = false,
}: PortalGame3DOverlaysProps) {
  const { t } = useTranslation("portal.player");
  const { partnerPid } = usePartnerManager();
  const { openModal } = useModalManager();
  const {
    portal,
    visible,
    panelModal,
    setPanelModal,
    rulesModalOpen,
    setRulesModalOpen,
    shopModalOpen,
    setShopModalOpen,
    giftCardOrdersModalOpen,
    setGiftCardOrdersModalOpen,
    accountModalOpen,
    setAccountModalOpen,
    weeklyCloseModalOpen,
    setWeeklyCloseModalOpen,
    weeklyCloseDisplay,
    showNote,
    signOut,
    openAssignments,
    openAssignment,
    leaderboardRows,
    tierView,
    historyReport,
    hasOpenRun,
    matchOverlayOpen,
    queueClaiming,
    queueWaiting,
    primaryQueueEntry,
    primaryQueueTitle,
    leavingMatch,
    handleLeaveMatchQueue,
    awaitingMatch,
  } = ctrl;

  return (
    <>
      <CasualPlayMatchOverlay
        className="portal-3d-match-overlay"
        open={visible !== 0 && !hasOpenRun && matchOverlayOpen}
        phase={queueClaiming ? "claiming" : "waiting"}
        waitingForPeer={
          awaitingMatch != null && !queueWaiting && !queueClaiming
            ? false
            : (primaryQueueEntry?.waitingForPeer ?? false)
        }
        tournamentTitle={primaryQueueTitle || undefined}
        leaving={leavingMatch}
        onLeave={
          queueWaiting && primaryQueueEntry?.waitingForPeer
            ? () => void handleLeaveMatchQueue()
            : undefined
        }
      />

      <PortalCenterModal
        open={panelModal === "lb"}
        title={t("leaderboard.cohortTitle")}
        onClose={() => setPanelModal(null)}
      >
        <PortalWeeklyLeaderboardPanel
          rows={leaderboardRows}
          myPoints={tierView.points ?? 0}
          myRank={tierView.rank ?? null}
          viewerUid={ctrl.user?.uid}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={panelModal === "history"}
        title={t("modals.historyTitle")}
        onClose={() => setPanelModal(null)}
      >
        <PortalHistoryList
          openAssignments={openAssignments}
          gameHistory={portal.gameHistory}
          onOpenAssignment={openAssignment}
          onOpenReport={historyReport.openReport}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={rulesModalOpen !== null}
        title={t("modals.rulesTitle")}
        onClose={() => setRulesModalOpen(null)}
      >
        <PortalRulesContent
          anchor={rulesModalOpen ?? undefined}
          currentTierId={ctrl.tierView.tierId}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={weeklyCloseModalOpen}
        title=""
        onClose={() => setWeeklyCloseModalOpen(false)}
      >
        <PortalWeeklyLeagueClosePanel
          display={weeklyCloseDisplay}
          tierId={
            (portal.weeklyLeagueTierView?.tierId as PortalTierId | undefined) ??
            tierView.tierId
          }
          onClaim={portal.claimPortalWeeklyLeagueRewards}
          onDismiss={portal.dismissPortalWeeklyLeagueClose}
          onClose={() => setWeeklyCloseModalOpen(false)}
          onClaimed={(coins) => showNote(t("weeklyLeague.claimedToast", { coins: coins.toLocaleString() }))}
        />
      </PortalCenterModal>

      <PortalAccountSheet
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onFeedback={ctrl.showNote}
        onSignOut={signOut}
        showSignOut={showAuthMenuActions}
      />

      <PortalCenterModal
        open={shopModalOpen}
        title={t("shop.title")}
        onClose={() => setShopModalOpen(false)}
      >
        <PortalShopPanel
          coins={
            portal.shopCatalog?.coins ??
            portal.playerWallet?.coins ??
            0
          }
          skus={resolvePortalShopSkus(portal.shopCatalog?.skus, partnerPid)}
          redemptionProfile={portal.shopCatalog?.redemptionProfile}
          giftCardOrderCount={portal.giftCardOrders?.length ?? 0}
          onOpenGiftCardOrders={() => setGiftCardOrdersModalOpen(true)}
          verifiedEmail={ctrl.userEmail}
          verifiedPhone={ctrl.userPhone}
          onPurchase={portal.purchasePortalShopSku}
          onSyncProfile={portal.syncRedemptionProfile}
          onFeedback={ctrl.showNote}
          adCoinOffer={ctrl.adCoinClientEnabled ? portal.adCoinOffer : null}
          onWatchAdForCoins={
            ctrl.adCoinClientEnabled ? portal.watchAdForCoins : undefined
          }
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={giftCardOrdersModalOpen}
        title={t("shop.ordersModalTitle")}
        onClose={() => setGiftCardOrdersModalOpen(false)}
      >
        <PortalGiftCardPanel
          orders={portal.giftCardOrders ?? []}
          onRedeem={portal.redeemGiftCard}
          onResendEmail={portal.resendGiftCardEmail}
          onFeedback={ctrl.showNote}
        />
      </PortalCenterModal>

      <PortalHistoryReportOverlays
        reportSummary={historyReport.reportSummary}
        reportTableMetaNote={historyReport.reportTableMetaNote}
        watchTarget={historyReport.watchTarget}
        watchLabel={historyReport.watchLabel}
        watchGameType={historyReport.watchGameType}
        onCloseReport={historyReport.closeReport}
        onCloseWatch={historyReport.closeWatch}
        onWatchFromReport={historyReport.openWatchFromReport}
      />

      {import.meta.env.DEV ? (
        <button
          type="button"
          onClick={() => openModal({ name: "solitaire_victory_anim_dev" })}
          style={{
            position: "fixed",
            right: 12,
            bottom: 12,
            zIndex: 99999,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.65)",
            color: "#e8f5e9",
            fontSize: 12,
            cursor: "pointer",
          }}
          title="Solitaire victory animation lab"
        >
          WinAnim Lab
        </button>
      ) : null}
    </>
  );
}
