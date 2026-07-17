import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { CasualGameScoreReportOverlay } from "@/component/battle/games/shared/CasualGameScoreReportOverlay";
import type {
  CasualAsyncTableSummaryUI,
  CasualWatchContext,
} from "@/component/battle/games/shared/casualAsyncTableSummaryUI";
import { formatHistoryReportTableMetaNote } from "@/component/battle/games/shared/casualAsyncTableSummaryUI";
import type { CasualGameScoreReportUI } from "@/component/battle/games/shared/casualGameScoreReportUI";
import "@/component/battle/games/shared/manualSettleConfirmOverlay.css";
import { PortalHistoryReportOverlays } from "@/component/lobby/portal/PortalHistoryReportOverlays";
import {
  portalWatchGameTypeForRow,
  type PortalWatchGameType,
} from "@/component/lobby/portal/service/portalHistoryReport";
import {
  usePortal,
  type CampaignPlayReportPayload,
} from "@/component/lobby/portal/service/usePortalManager";

import { campaignGameTypeLabel } from "../shared/campaignDetailsDisplay";
import type { CampaignPlayHistoryEntry } from "../shared/campaignTypes";
import { CampaignCenterModal } from "./CampaignCenterModal";

type Props = {
  open: boolean;
  onClose: () => void;
  authed: boolean;
  entries: CampaignPlayHistoryEntry[];
  locale: string;
  title?: string;
  rewardModel?: "pass_per_run" | "competitive_leaderboard";
  mode?: "solo" | "multi";
};

function isInProgressStatus(status: CampaignPlayHistoryEntry["status"]): boolean {
  return status === "open" || status === "replaying";
}

function resolveRewardMode(
  entry: CampaignPlayHistoryEntry,
  fallback?: "pass_per_run" | "competitive_leaderboard"
): "pass_per_run" | "competitive_leaderboard" {
  if (
    entry.campaignRewardMode === "pass_per_run" ||
    entry.campaignRewardMode === "competitive_leaderboard"
  ) {
    return entry.campaignRewardMode;
  }
  return fallback ?? "pass_per_run";
}

function formatPointsDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** 进行中不展示；其余一律展示（数据按需拉取） */
function canShowReportButton(entry: CampaignPlayHistoryEntry): boolean {
  return !isInProgressStatus(entry.status);
}

function buildSoloScoreFallback(entry: CampaignPlayHistoryEntry): CasualGameScoreReportUI {
  const score = entry.score ?? 0;
  const target = entry.seedScoreThreshold;
  const success =
    typeof entry.challengeSuccess === "boolean"
      ? entry.challengeSuccess
      : target != null
        ? score >= target
        : undefined;
  return {
    gameLabel: campaignGameTypeLabel(entry.gameType),
    lines: [{ label: "本局得分", value: score }],
    totalScore: score,
    ...(target != null && success != null
      ? {
          challenge: {
            targetScore: target,
            achievedScore: score,
            success,
          },
        }
      : {}),
  };
}

function preferSoloScoreReport(
  entry: CampaignPlayHistoryEntry,
  campaignMode: "solo" | "multi" | undefined,
  rewardModel: "pass_per_run" | "competitive_leaderboard" | undefined
): boolean {
  const mode = entry.mode ?? campaignMode ?? "solo";
  if (mode === "solo") return true;
  // pass_run 单人挑战模板偶发 mode 缺失时仍走得分战报
  const reward = resolveRewardMode(entry, rewardModel);
  return reward === "pass_per_run" && mode !== "multi";
}

export const CampaignHistorySheet: React.FC<Props> = ({
  open,
  onClose,
  authed,
  entries,
  locale,
  title,
  rewardModel,
  mode: campaignMode,
}) => {
  const { t } = useTranslation("campaign.player");
  const { t: portalT } = useTranslation("portal.player");
  const portal = usePortal();

  const [scoreReport, setScoreReport] = useState<CasualGameScoreReportUI | null>(null);
  const [scoreWatchContext, setScoreWatchContext] = useState<CasualWatchContext | null>(null);
  const [reportSummary, setReportSummary] = useState<CasualAsyncTableSummaryUI | null>(null);
  const [reportTableMetaNote, setReportTableMetaNote] = useState<string | undefined>();
  const [reportLoadingMatchId, setReportLoadingMatchId] = useState<string | null>(null);
  const [watchTarget, setWatchTarget] = useState<CasualWatchContext | null>(null);
  const [watchLabel, setWatchLabel] = useState("");
  const [watchGameType, setWatchGameType] = useState<PortalWatchGameType | null>(null);

  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const showCompetitiveHint = useMemo(() => {
    if (rewardModel === "competitive_leaderboard") return true;
    return entries.some((e) => e.campaignRewardMode === "competitive_leaderboard");
  }, [entries, rewardModel]);

  const closeReport = useCallback(() => {
    setScoreReport(null);
    setScoreWatchContext(null);
    setReportSummary(null);
    setReportTableMetaNote(undefined);
    setWatchTarget(null);
    setWatchLabel("");
    setWatchGameType(null);
  }, []);

  const openReport = useCallback(
    async (entry: CampaignPlayHistoryEntry) => {
      if (!canShowReportButton(entry) || reportLoadingMatchId) return;
      setReportLoadingMatchId(entry.matchId);
      try {
        let payload: CampaignPlayReportPayload | null = null;
        try {
          payload = await portal.getCampaignPlayReport({ matchId: entry.matchId });
        } catch (e) {
          console.warn("[Campaign] getCampaignPlayReport", e);
        }

        const useSolo =
          payload?.reportKind === "solo_score" ||
          (payload == null && preferSoloScoreReport(entry, campaignMode, rewardModel));

        setWatchGameType(portalWatchGameTypeForRow(entry.gameType));
        setWatchTarget(null);
        setWatchLabel("");

        if (useSolo) {
          const report = payload?.scoreReport ?? buildSoloScoreFallback(entry);
          setScoreReport(report);
          setScoreWatchContext(payload?.watchContext ?? null);
          setReportSummary(null);
          setReportTableMetaNote(undefined);
          return;
        }

        const summary =
          payload?.tableSummary?.rows?.length
            ? payload.tableSummary
            : ({
                maxPlayers: 1,
                rows: [
                  {
                    rank: entry.rank ?? 1,
                    score: entry.score ?? 0,
                    displayLabel: portalT("report.you", { defaultValue: "你" }),
                    isYou: true,
                  },
                ],
                isBoardStable: true,
              } satisfies CasualAsyncTableSummaryUI);

        setScoreReport(null);
        setScoreWatchContext(null);
        setReportSummary(summary);
        setReportTableMetaNote(
          formatHistoryReportTableMetaNote({
            rank: entry.rank,
            pointDelta: entry.pointsDelta,
          })
        );
      } finally {
        setReportLoadingMatchId(null);
      }
    },
    [campaignMode, portal, portalT, reportLoadingMatchId, rewardModel]
  );

  const openWatchFromReport = useCallback(
    (ctx: CasualWatchContext, displayLabel: string, gameType?: PortalWatchGameType) => {
      setWatchTarget(ctx);
      setWatchLabel(displayLabel);
      if (gameType) setWatchGameType(gameType);
    },
    []
  );

  const openWatchFromScoreReport = useCallback(() => {
    if (!scoreWatchContext) return;
    setWatchTarget(scoreWatchContext);
    setWatchLabel(portalT("report.you", { defaultValue: "你" }));
  }, [portalT, scoreWatchContext]);

  const closeWatch = useCallback(() => {
    setWatchTarget(null);
    setWatchLabel("");
  }, []);

  const handleHistoryClose = useCallback(() => {
    if (watchTarget != null) {
      closeWatch();
      return;
    }
    if (scoreReport != null || reportSummary != null) {
      closeReport();
      return;
    }
    onClose();
  }, [closeReport, closeWatch, onClose, reportSummary, scoreReport, watchTarget]);

  const reportOverlays =
    typeof document !== "undefined"
      ? createPortal(
          <>
            <CasualGameScoreReportOverlay
              open={scoreReport != null && watchTarget == null}
              report={scoreReport}
              onConfirm={closeReport}
              title={portalT("report.title")}
              confirmLabel={portalT("report.dismiss")}
              secondaryLabel={
                scoreWatchContext ? portalT("report.watch") : undefined
              }
              onSecondary={scoreWatchContext ? openWatchFromScoreReport : undefined}
            />
            <PortalHistoryReportOverlays
              reportSummary={reportSummary}
              reportTableMetaNote={reportTableMetaNote}
              watchTarget={watchTarget}
              watchLabel={watchLabel}
              watchGameType={watchGameType}
              onCloseReport={closeReport}
              onCloseWatch={closeWatch}
              onWatchFromReport={openWatchFromReport}
            />
          </>,
          document.body
        )
      : null;

  return (
    <>
      <CampaignCenterModal
        open={open}
        title={title ?? t("history.title")}
        titleId="campaign-history-title"
        onClose={handleHistoryClose}
      >
        <div className="campaign-history">
          {showCompetitiveHint ? (
            <p className="campaign-history__hint">{t("history.competitiveHint")}</p>
          ) : null}
          {!authed ? (
            <p className="campaign-history__empty">{t("history.signInHint")}</p>
          ) : entries.length === 0 ? (
            <p className="campaign-history__empty">{t("history.empty")}</p>
          ) : (
            <ul className="campaign-history__list">
              {entries.map((entry) => {
                const inProgress = isInProgressStatus(entry.status);
                const statusLabel = inProgress
                  ? t("history.status.inProgress")
                  : t(`history.status.${entry.status}`, { defaultValue: entry.status });
                const entryMode = entry.mode ?? campaignMode ?? "solo";
                const entryRewardMode = resolveRewardMode(entry, rewardModel);
                const settled = entry.status === "settled" || entry.status === "confirmed";
                const showReport = canShowReportButton(entry);
                const reportBusy = reportLoadingMatchId === entry.matchId;

                const challengeOutcome = (() => {
                  if (entryRewardMode !== "pass_per_run" || entryMode !== "solo" || inProgress) {
                    return null;
                  }
                  if (entry.challengeSuccess === true) return "success" as const;
                  if (entry.challengeSuccess === false) return "fail" as const;
                  if (entry.rewardLabel) return "success" as const;
                  if (settled) return "fail" as const;
                  return null;
                })();

                return (
                  <li key={entry.runTournamentId} className="campaign-history__item">
                    <div className="campaign-history__row">
                      <strong className="campaign-history__game">
                        {campaignGameTypeLabel(entry.gameType)}
                        <span className="campaign-history__mode">
                          {" · "}
                          {entryMode === "solo"
                            ? t("history.modeSolo")
                            : t("history.modeMulti")}
                        </span>
                      </strong>
                      <div className="campaign-history__row-actions">
                        {showReport ? (
                          <button
                            type="button"
                            className="campaign-history__report-btn"
                            disabled={reportBusy}
                            onClick={() => void openReport(entry)}
                          >
                            {reportBusy
                              ? t("history.reportLoading")
                              : t("history.reportBtn")}
                          </button>
                        ) : null}
                        <span
                          className={`campaign-history__status${
                            inProgress ? " campaign-history__status--active" : ""
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    <div className="campaign-history__stats">
                      {entry.score != null ? (
                        <span className="campaign-history__score">
                          {t("history.score", { score: entry.score })}
                        </span>
                      ) : (
                        <span className="campaign-history__score campaign-history__score--muted">
                          {t("history.noScore")}
                        </span>
                      )}

                      {entryRewardMode === "pass_per_run" &&
                      entryMode === "solo" &&
                      challengeOutcome ? (
                        <span
                          className={`campaign-history__outcome campaign-history__outcome--${challengeOutcome}`}
                        >
                          {challengeOutcome === "success"
                            ? t("history.challengeSuccess")
                            : t("history.challengeFail")}
                        </span>
                      ) : null}

                      {entryRewardMode === "pass_per_run" &&
                      entryMode === "multi" &&
                      entry.rank != null ? (
                        <span className="campaign-history__rank">
                          {t("history.rank", { rank: entry.rank })}
                        </span>
                      ) : null}

                      {entryRewardMode === "competitive_leaderboard" &&
                      entry.pointsDelta != null ? (
                        <span
                          className={`campaign-history__points${
                            entry.pointsDelta >= 0
                              ? " campaign-history__points--pos"
                              : " campaign-history__points--neg"
                          }`}
                        >
                          {t("history.pointsDelta", {
                            delta: formatPointsDelta(entry.pointsDelta),
                          })}
                        </span>
                      ) : null}

                      {entryRewardMode === "competitive_leaderboard" &&
                      entryMode === "multi" &&
                      entry.rank != null ? (
                        <span className="campaign-history__rank">
                          {t("history.rank", { rank: entry.rank })}
                        </span>
                      ) : null}
                    </div>

                    {entryRewardMode === "pass_per_run" && entry.rewardLabel ? (
                      <p className="campaign-history__reward">
                        {t("history.rewardEarned", { label: entry.rewardLabel })}
                      </p>
                    ) : null}

                    {entryRewardMode === "pass_per_run" &&
                    settled &&
                    !entry.rewardLabel &&
                    (entryMode === "multi" || challengeOutcome === "fail") ? (
                      <p className="campaign-history__reward campaign-history__reward--muted">
                        {t("history.rewardNone")}
                      </p>
                    ) : null}

                    <p className="campaign-history__meta">
                      {t("history.playedAt", { at: fmt(entry.playedAt) })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CampaignCenterModal>

      {reportOverlays}
    </>
  );
};
