import React, { useCallback, useState } from "react";

import Match3LobbyWatchOverlay from "@/component/battle/games/match3/battle/replay/Match3LobbyWatchOverlay";
import SolitaireLobbyWatchOverlay from "@/component/battle/games/solitaireSolo/battle/replay/SolitaireLobbyWatchOverlay";
import BlockBlastLobbyWatchOverlay from "@/component/battle/games/blockBlast/battle/replay/BlockBlastLobbyWatchOverlay";
import YatzLobbyWatchOverlay from "@/component/battle/games/yatz/battle/replay/YatzLobbyWatchOverlay";
import { CasualPostSettleSummaryOverlay } from "@/component/battle/games/shared/CasualPostSettleSummaryOverlay";
import type {
  CasualAsyncTableSummaryUI,
  CasualWatchContext,
} from "@/component/battle/games/shared/casualAsyncTableSummaryUI";
import { formatHistoryReportTableMetaNote } from "@/component/battle/games/shared/casualAsyncTableSummaryUI";
import "@/component/battle/games/shared/manualSettleConfirmOverlay.css";

import type { PortalGameHistoryRow } from "./service/usePortalManager";
import {
  canOpenPortalHistoryReport,
  portalHistoryTableSummary,
  portalWatchGameTypeForRow,
  type PortalWatchGameType,
} from "./service/portalHistoryReport";

export function usePortalHistoryReport() {
  const [reportSummary, setReportSummary] = useState<CasualAsyncTableSummaryUI | null>(null);
  const [reportTableMetaNote, setReportTableMetaNote] = useState<string | undefined>();
  const [watchTarget, setWatchTarget] = useState<CasualWatchContext | null>(null);
  const [watchLabel, setWatchLabel] = useState("");
  const [watchGameType, setWatchGameType] = useState<PortalWatchGameType | null>(null);

  const openReport = useCallback((row: PortalGameHistoryRow) => {
    if (!canOpenPortalHistoryReport(row)) return;
    const summary = portalHistoryTableSummary(row);
    if (!summary) return;
    setReportSummary(summary);
    setReportTableMetaNote(
      formatHistoryReportTableMetaNote({
        rank: row.rank,
        pointDelta: row.pointDelta,
        settlementPending: row.settlementPending,
      })
    );
    setWatchGameType(portalWatchGameTypeForRow(row.gameType));
    setWatchTarget(null);
    setWatchLabel("");
  }, []);

  const closeReport = useCallback(() => {
    setReportSummary(null);
    setReportTableMetaNote(undefined);
    setWatchTarget(null);
    setWatchLabel("");
    setWatchGameType(null);
  }, []);

  const openWatchFromReport = useCallback(
    (ctx: CasualWatchContext, displayLabel: string, gameType?: PortalWatchGameType) => {
      setWatchTarget(ctx);
      setWatchLabel(displayLabel);
      if (gameType) setWatchGameType(gameType);
    },
    []
  );

  const closeWatch = useCallback(() => {
    setWatchTarget(null);
    setWatchLabel("");
  }, []);

  return {
    openReport,
    closeReport,
    openWatchFromReport,
    closeWatch,
    reportSummary,
    reportTableMetaNote,
    watchTarget,
    watchLabel,
    watchGameType,
  };
}

export const PortalHistoryReportOverlays: React.FC<{
  reportSummary: CasualAsyncTableSummaryUI | null;
  reportTableMetaNote?: string;
  watchTarget: CasualWatchContext | null;
  watchLabel: string;
  watchGameType: PortalWatchGameType | null;
  onCloseReport: () => void;
  onCloseWatch: () => void;
  onWatchFromReport: (
    ctx: CasualWatchContext,
    displayLabel: string,
    gameType?: PortalWatchGameType
  ) => void;
}> = ({
  reportSummary,
  reportTableMetaNote,
  watchTarget,
  watchLabel,
  watchGameType,
  onCloseReport,
  onCloseWatch,
  onWatchFromReport,
}) => (
  <>
    <CasualPostSettleSummaryOverlay
      open={reportSummary != null && watchTarget == null}
      title="战报"
      subtitle="本桌全部玩家得分与名次。点击各行「回放」可查看该玩家本局操作。"
      summary={reportSummary}
      tableMetaNote={reportTableMetaNote}
      onDismiss={onCloseReport}
      dismissLabel="关闭"
      onWatchRow={onWatchFromReport}
      watchButtonLabel="回放"
      pinFooter
    />
    {watchGameType === "match_3" ? (
      <Match3LobbyWatchOverlay
        open={watchTarget != null}
        watchContext={watchTarget}
        displayLabel={watchLabel}
        onClose={onCloseWatch}
      />
    ) : watchGameType === "solitaire" ? (
      <SolitaireLobbyWatchOverlay
        open={watchTarget != null}
        watchContext={watchTarget}
        displayLabel={watchLabel}
        onClose={onCloseWatch}
      />
    ) : watchGameType === "block_blast" ? (
      <BlockBlastLobbyWatchOverlay
        open={watchTarget != null}
        watchContext={watchTarget}
        displayLabel={watchLabel}
        onClose={onCloseWatch}
      />
    ) : watchGameType === "yatz" ? (
      <YatzLobbyWatchOverlay
        open={watchTarget != null}
        watchContext={watchTarget}
        displayLabel={watchLabel}
        onClose={onCloseWatch}
      />
    ) : null}
  </>
);
