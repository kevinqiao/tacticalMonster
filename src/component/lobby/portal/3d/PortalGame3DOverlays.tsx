import React from "react";

import CasualPlayMatchOverlay from "../../casual/view/play/CasualPlayMatchOverlay";
import { PortalCenterModal } from "../PortalCenterModal";
import {
  PortalHistoryList,
  PortalWeeklyLeaderboardPanel,
} from "../PortalPanels";
import { PortalHistoryReportOverlays } from "../PortalHistoryReportOverlays";
import { PortalRulesContent } from "./PortalRulesContent";

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
    openAssignments,
    openAssignment,
    mergedLeaderboard,
    myTotalPoints,
    myTotalRank,
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
        title="本周总榜"
        onClose={() => setPanelModal(null)}
      >
        <PortalWeeklyLeaderboardPanel
          rows={mergedLeaderboard}
          myPoints={myTotalPoints}
          myRank={myTotalRank}
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
        open={shopModalOpen}
        title="兑换商店"
        onClose={() => setShopModalOpen(false)}
      >
        <div
          className="rules-dialog-content"
          style={{ textAlign: "center", padding: "24px 10px" }}
        >
          <span style={{ fontSize: "64px", display: "block", marginBottom: "16px" }}>
            🎁
          </span>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: 900,
              margin: "0 0 12px",
            }}
          >
            兑换商店筹备中
          </h3>
          <p style={{ margin: 0 }}>
            金币与礼品兑换功能正在火热制作中！
            <br />
            参与单人与多人竞技获取的排行榜周榜积分，后续可在商店内直接兑换神秘大礼，敬请期待！✨
          </p>
        </div>
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
