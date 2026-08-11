import React from "react";
import { useTranslation } from "react-i18next";

import { usePartnerManager } from "host/service/PartnerManager";
import { useModalManager } from "host/service/ModalManager";
import { isEmbedLikelyContext } from "@/host/service/platformAuth/embedSources/embedContextDetect";

import CasualPlayMatchOverlay from "../../casual/view/play/CasualPlayMatchOverlay";
import { PortalCenterModal } from "../PortalCenterModal";
import {
  PortalHistoryList,
  PortalWeeklyLeaderboardPanel,
} from "../PortalPanels";
import { PortalHistoryReportOverlays } from "../PortalHistoryReportOverlays";
import { PortalRulesContent } from "./PortalRulesContent";
import { PortalShopOrdersPanel } from "./PortalShopOrdersPanel";
import { PortalShopPanel } from "./PortalShopPanel";
import { PortalAccountSheet } from "./PortalAccountSheet";
import {
  resolvePortalShopSkus,
} from "./portalShopCatalogFallback";
import { PortalWeeklyLeagueClosePanel } from "./PortalWeeklyLeagueClosePanel";
import { PortalSeasonMarksModal } from "./PortalSeasonMarksModal";
import type { PortalTierId } from "./portalGame3DTheme";

import type { usePortalGame3DController } from "./usePortalGame3DController";
import PortalTournamentPickerModal from "../PortalTournamentPickerModal";
import { PortalMultiRankRewardsSheet } from "../PortalMultiRankRewardsSheet";

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
    accountFocusBadges,
    setAccountFocusBadges,
    openAccountBadges,
    weeklyCloseModalOpen,
    setWeeklyCloseModalOpen,
    weeklyCloseDisplay,
    seasonMarksModalOpen,
    dismissSeasonMarksModal,
    showNote,
    signOut,
    openAssignments,
    openAssignment,
    leaderboardRows,
    tierView,
    historyReport,
    hasOpenRun,
    matchOverlayOpen,
    joining,
    openingPlay,
    queueClaiming,
    queueWaiting,
    primaryQueueEntry,
    primaryQueueTitle,
    leavingMatch,
    handleLeaveMatchQueue,
    awaitingMatch,
    tournamentPicker,
    closeTournamentPicker,
    selectTournamentFromPicker,
    rankRewardsTournamentId,
    rankRewardsTitleOverride,
    openRankRewards,
    closeRankRewards,
  } = ctrl;

  // Creating copy: solo/multi open-play bridge, or multi queue claiming. Multi join/wait → Matching.
  const creatingMatch =
    joining === "solo" ||
    openingPlay === "solo" ||
    openingPlay === "multi" ||
    queueClaiming;
  const multiMatching =
    joining === "multi" ||
    awaitingMatch != null ||
    queueWaiting;

  return (
    <>
      <PortalTournamentPickerModal
        // Hide once Creating / Matching starts (solo or multi open-play bridge).
        open={
          tournamentPicker != null &&
          joining == null &&
          openingPlay == null &&
          awaitingMatch == null &&
          !queueWaiting &&
          !queueClaiming
        }
        mode={tournamentPicker?.mode ?? "solo"}
        offerings={tournamentPicker?.offerings ?? []}
        resolveEntry={(tournamentId) =>
          ctrl.entryStateForTournament(
            tournamentId,
            tournamentPicker?.mode ?? "solo"
          )
        }
        dailyQuota={
          (tournamentPicker?.mode ?? "solo") === "solo"
            ? {
                freeUsed: ctrl.soloLadderPlaysToday,
                freeCap: ctrl.soloMaxPlaysPerDay,
                adUsed: ctrl.portal.adEntryOffer?.solo.usedToday ?? 0,
                adCap: ctrl.portal.adEntryOffer?.solo.cap ?? 0,
                adEnabled: ctrl.portal.adEntryOffer?.solo.enabled === true,
                successEnabled: ctrl.soloSuccessEnabled,
                successUsed: ctrl.soloSuccessUsedToday,
                successCap: ctrl.soloSuccessDailyCap,
              }
            : {
                freeUsed: ctrl.multiLadderPlaysToday,
                freeCap: ctrl.multiMaxPlaysPerDay,
                adUsed: ctrl.portal.adEntryOffer?.multi.usedToday ?? 0,
                adCap: ctrl.portal.adEntryOffer?.multi.cap ?? 0,
                adEnabled: ctrl.portal.adEntryOffer?.multi.enabled === true,
              }
        }
        onSelect={selectTournamentFromPicker}
        onClose={closeTournamentPicker}
        onOpenRankRewards={
          (tournamentPicker?.mode ?? "solo") === "multi"
            ? openRankRewards
            : undefined
        }
      />
      <PortalMultiRankRewardsSheet
        open={rankRewardsTournamentId != null}
        tournamentId={rankRewardsTournamentId}
        titleOverride={rankRewardsTitleOverride}
        onClose={closeRankRewards}
      />
      <CasualPlayMatchOverlay
        className="portal-3d-match-overlay"
        open={
          visible !== 0 &&
          matchOverlayOpen &&
          (creatingMatch || multiMatching || !hasOpenRun)
        }
        phase={creatingMatch ? "claiming" : "waiting"}
        waitingForPeer={
          creatingMatch
            ? false
            : multiMatching
              ? (primaryQueueEntry?.waitingForPeer ?? true)
              : false
        }
        tournamentTitle={primaryQueueTitle || undefined}
        leaving={leavingMatch}
        onLeave={
          // Leave only while waiting in queue. Creating / claiming / open-play bridge: committed.
          !creatingMatch && (awaitingMatch != null || queueWaiting)
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
        onClose={() => {
          setAccountModalOpen(false);
          setAccountFocusBadges(false);
        }}
        onFeedback={ctrl.showNote}
        onSignOut={signOut}
        showSignOut={showAuthMenuActions}
        focusBadges={accountFocusBadges}
      />

      <PortalSeasonMarksModal
        open={seasonMarksModalOpen}
        seasonId={
          portal.weeklyLeagueTierView?.unreadSeasonId ??
          portal.weeklyLeagueTierView?.seasonId ??
          "S0"
        }
        seasonLevel={
          portal.weeklyLeagueTierView?.unreadSeasonLevel ??
          portal.weeklyLeagueTierView?.seasonLevel ??
          1
        }
        onViewBadges={() => {
          void dismissSeasonMarksModal();
          openAccountBadges();
        }}
        onDismiss={() => void dismissSeasonMarksModal()}
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
          orderCount={portal.shopOrders?.length ?? 0}
          onOpenOrders={() => setGiftCardOrdersModalOpen(true)}
          verifiedEmail={ctrl.userEmail}
          verifiedPhone={ctrl.userPhone}
          onPurchase={portal.purchasePortalShopSku}
          onStripeCheckout={portal.createStripeCheckout}
          stripeCheckoutEnabled={!isEmbedLikelyContext()}
          onSyncProfile={portal.syncRedemptionProfile}
          onFeedback={ctrl.showNote}
          adCoinOffer={ctrl.adCoinClientEnabled ? portal.adCoinOffer : null}
          onWatchAdForCoins={
            ctrl.adCoinClientEnabled ? portal.watchAdForCoins : undefined
          }
          dailyCheckin={portal.dailyCheckin}
          onClaimDailyCheckin={portal.claimDailyCheckin}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={giftCardOrdersModalOpen}
        title={t("shop.ordersModalTitle")}
        onClose={() => setGiftCardOrdersModalOpen(false)}
      >
        <PortalShopOrdersPanel
          orders={portal.shopOrders ?? []}
          onRedeem={portal.redeemGiftCard}
          onResendEmail={portal.resendGiftCardEmail}
          onFeedback={ctrl.showNote}
        />
      </PortalCenterModal>

      <PortalHistoryReportOverlays
        scoreReport={historyReport.scoreReport}
        scoreWatchContext={historyReport.scoreWatchContext}
        reportSummary={historyReport.reportSummary}
        reportTableMetaNote={historyReport.reportTableMetaNote}
        watchTarget={historyReport.watchTarget}
        watchLabel={historyReport.watchLabel}
        watchGameType={historyReport.watchGameType}
        onCloseReport={historyReport.closeReport}
        onCloseWatch={historyReport.closeWatch}
        onWatchFromReport={historyReport.openWatchFromReport}
        onWatchFromScoreReport={historyReport.openWatchFromScoreReport}
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
