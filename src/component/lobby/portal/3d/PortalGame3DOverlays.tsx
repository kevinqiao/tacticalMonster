import React from "react";

import CasualPlayMatchOverlay from "../../casual/view/play/CasualPlayMatchOverlay";
import { PortalCenterModal } from "../PortalCenterModal";
import {
  PortalHistoryList,
  PortalWeeklyLeaderboardPanel,
} from "../PortalPanels";
import { PortalHistoryReportOverlays } from "../PortalHistoryReportOverlays";
import { PortalRulesContent } from "./PortalRulesContent";
import { PortalShopPanel } from "./PortalShopPanel";
import { resolvePortalShopSkus } from "./portalShopCatalogFallback";
import { PortalWeeklyLeagueClosePanel } from "./PortalWeeklyLeagueClosePanel";
import type { PortalTierId } from "./portalGame3DTheme";

import type { usePortalGame3DController } from "./usePortalGame3DController";

type Controller = ReturnType<typeof usePortalGame3DController>;

type PortalGame3DOverlaysProps = {
  ctrl: Controller;
};

export function PortalGame3DOverlays({ ctrl }: PortalGame3DOverlaysProps) {
  const {
    portal,
    visible,
    panelModal,
    setPanelModal,
    rulesModalOpen,
    setRulesModalOpen,
    shopModalOpen,
    setShopModalOpen,
    weeklyCloseModalOpen,
    setWeeklyCloseModalOpen,
    weeklyCloseDisplay,
    showNote,
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
        title={
          portal.weeklyLeagueTierView?.enrolled && portal.cohortLeaderboard.length > 0
            ? "本组排行"
            : "本周总榜"
        }
        onClose={() => setPanelModal(null)}
      >
        <PortalWeeklyLeaderboardPanel
          rows={leaderboardRows}
          myPoints={tierView.points ?? 0}
          myRank={tierView.rank ?? null}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={panelModal === "history"}
        title="历史记录"
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
        title="玩法规则"
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
          onClaimed={(coins) => showNote(`已领取 ${coins.toLocaleString()} 金币`)}
        />
      </PortalCenterModal>

      <PortalCenterModal
        open={shopModalOpen}
        title="兑换商店"
        onClose={() => setShopModalOpen(false)}
      >
        <PortalShopPanel
          coins={
            portal.shopCatalog?.coins ??
            portal.playerWallet?.coins ??
            0
          }
          skus={resolvePortalShopSkus(portal.shopCatalog?.skus)}
          onPurchase={portal.purchasePortalShopSku}
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
    </>
  );
}
