import {
  getTournamentDefinition,
  listTriathlonLobbyTemplates,
  type CasualTournamentDefinition,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { ModalProp, useModalManager } from "host/service/ModalManager";
import React, { useCallback, useMemo, useState } from "react";

import {
  awaitWatchGameKindForTemplate,
  casualGameKindFromGameType,
  hasAnyOpenCasualRunAssignment,
  pickLatestOpenTriathlonAssignment,
  type CasualPlayModalName,
  type OpenCasualRunAssignment,
} from "../../service/casualOpenRunAssignment";
import {
  type AwaitOpenCasualRunMatchWatch,
  useAwaitOpenCasualRunAssignment,
} from "../../service/useAwaitOpenCasualRunAssignment";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import {
  previewCoinsCost,
  previewGemsCost,
  previewVoucherCost,
} from "../shared/casualActivityUi";
import { resolveJoinTournamentOutcome } from "../../service/casualJoinTournamentFlow";
import { joinEntryErrorMessage } from "../shared/casualEconomyUi";
import "./casualTournamentLobbyModal.css";

interface TournamentRow {
  tournamentId: string;
  title: string;
  matchType: "triathlon_a" | "triathlon_b" | "triathlon_c";
  entryLabel: string;
}

function badgeLabel(matchType: TournamentRow["matchType"]): string {
  if (matchType === "triathlon_a") return "A";
  if (matchType === "triathlon_b") return "B";
  return "C";
}

function badgeClass(matchType: TournamentRow["matchType"]): string {
  if (matchType === "triathlon_a") return "casual-game-tour__badge casual-game-tour__badge--a";
  if (matchType === "triathlon_b") return "casual-game-tour__badge casual-game-tour__badge--b";
  return "casual-game-tour__badge casual-game-tour__badge--c";
}

function firstGameKindForTemplate(templateId: string) {
  return awaitWatchGameKindForTemplate(templateId);
}

const CasualTriathlonLobbyModal: React.FC<ModalProp> = ({ visible, close }) => {
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [resumeOpening, setResumeOpening] = useState(false);
  const [awaitingMatch, setAwaitingMatch] = useState<AwaitOpenCasualRunMatchWatch | null>(null);
  const [leavingMatch, setLeavingMatch] = useState(false);

  const latestTriathlonAssignment = useMemo(() => {
    if (!visible || !casual.convexUrl) return null;
    return pickLatestOpenTriathlonAssignment(casual.openRunAssignments);
  }, [visible, casual.convexUrl, casual.openRunAssignments]);

  const rows = useMemo(() => {
    return listTriathlonLobbyTemplates().map((t) => {
      const def = getTournamentDefinition(t.tournamentId);
      return {
        tournamentId: t.tournamentId,
        title: t.title,
        matchType: t.matchType,
        entryLabel: formatEntryLabel(casual.activities, t.tournamentId, def),
      };
    });
  }, [casual.activities]);

  const OPEN_GAME_AFTER_CLOSE_MS = 520;

  const openAfterClose = (modalName: CasualPlayModalName, modalData?: Record<string, unknown>) => {
    close();
    window.setTimeout(() => {
      setNote(null);
      openModal({ name: modalName, data: modalData });
    }, OPEN_GAME_AFTER_CLOSE_MS);
  };

  const handleOngoingEnter = () => {
    const hit = latestTriathlonAssignment;
    if (!hit || resumeOpening || joiningId !== null) return;
    setResumeOpening(true);
    window.setTimeout(() => setResumeOpening(false), OPEN_GAME_AFTER_CLOSE_MS + 200);
    openAfterClose("play_casual_triathlon_session", {
      casualTournamentId: hit.templateId,
      casualMatchGameId: hit.gameId,
    });
  };

  const openMatchedAssignment = useCallback(
    (hit: OpenCasualRunAssignment, templateId: string) => {
      setNote("已入场，正在进入对局...");
      openAfterClose("play_casual_triathlon_session", {
        casualTournamentId: templateId,
        casualMatchGameId: hit.gameId,
      });
      void casual.refreshCasualPlayer();
    },
    [casual.refreshCasualPlayer, openAfterClose]
  );

  useAwaitOpenCasualRunAssignment({
    watch: awaitingMatch,
    enabled: visible,
    openRunAssignments: casual.openRunAssignments,
    onMatched: (hit) => {
      if (!awaitingMatch) return;
      setAwaitingMatch(null);
      setJoiningId(null);
      void casual.refreshCasualPlayer();
      openMatchedAssignment(hit, awaitingMatch.templateId);
    },
    onTimeout: () => {
      setAwaitingMatch(null);
      setJoiningId(null);
      setNote("仍在排队或匹配超时，请稍后重试。");
      void casual.refreshCasualPlayer();
    },
  });

  const queue = casual.matchQueueEntries;
  const queueWaiting = queue.some((e) => e.status === "waiting");
  const queueClaiming = queue.some((e) => e.status === "claiming");
  const hasOpenRun = latestTriathlonAssignment != null;
  const playBlocked = hasOpenRun || queueWaiting || queueClaiming;
  const primaryQueueEntry = queue[0];
  const primaryQueueTitle = primaryQueueEntry
    ? getTournamentDefinition(primaryQueueEntry.templateId)?.title ?? primaryQueueEntry.templateId
    : "";

  const handleLeaveMatchQueue = async () => {
    if (leavingMatch || !queueWaiting) return;
    setLeavingMatch(true);
    try {
      const res = await casual.leaveCasualMatchQueue(primaryQueueEntry?.templateId);
      setAwaitingMatch(null);
      setJoiningId(null);
      if (res.ok) {
        setNote(null);
      } else if (res.error === "cannot_leave_claiming") {
        setNote("正在创建对局，请稍候…");
      } else if (res.error === "not_in_queue") {
        setNote("当前不在匹配队列中。");
      } else {
        setNote(`退出失败：${res.error}`);
      }
    } finally {
      setLeavingMatch(false);
    }
  };

  const handlePlay = async (row: TournamentRow) => {
    if (hasAnyOpenCasualRunAssignment(casual.openRunAssignments)) {
      setNote("有未结束的锦标对局，请先完成后再加入新场。");
      return;
    }
    if (playBlocked && !queueWaiting) {
      setNote("正在匹配或对局创建中，请稍候。");
      return;
    }
    if (queueWaiting) {
      setNote("已在匹配队列中，请先退出匹配或等待开桌。");
      return;
    }
    setJoiningId(row.tournamentId);
    setAwaitingMatch(null);
    setNote(null);
    try {
      const pv = await casual.fetchJoinEntryChargePreview(row.tournamentId);
      if (!pv || !pv.ok) {
        setNote(
          pv && !pv.ok
            ? joinEntryErrorMessage(pv.error)
            : "无法预览入场条件，请稍后重试。"
        );
        setJoiningId(null);
        return;
      }

      const outcome = resolveJoinTournamentOutcome(
        await casual.joinTournament(row.tournamentId)
      );
      if (outcome.kind === "queued") {
        setAwaitingMatch({
          templateId: row.tournamentId,
          gameKind: firstGameKindForTemplate(row.tournamentId),
        });
        setJoiningId(null);
        close();
        return;
      }
      if (outcome.kind === "ready") {
        setNote("已入场，正在进入对局...");
        openAfterClose("play_casual_triathlon_session", {
          casualTournamentId: outcome.templateId,
          casualMatchGameId: outcome.gameId,
        });
        void casual.refreshCasualPlayer();
        setJoiningId(null);
        close();
        return;
      }
      setNote(outcome.error);
      await casual.refreshCasualPlayer();
      setJoiningId(null);
    } catch {
      setJoiningId(null);
      setAwaitingMatch(null);
    }
  };

  if (!visible) return null;
  return (
    <div className="casual-game-tour">
      <div className="casual-game-tour__head">
        <h2 className="casual-game-tour__title">三场合战</h2>
        <p className="casual-game-tour__sub">Block Blast → Solitaire → Match-3 · 总分排名</p>
      </div>
      {note ? <p className="casual-game-tour__note">{note}</p> : null}
      {hasOpenRun ? (
        <div className="casual-game-tour__resume" role="status">
          <p className="casual-game-tour__resumeText">
            有一场进行中的三场合战
            {latestTriathlonAssignment?.gameIndex != null
              ? `（第 ${latestTriathlonAssignment.gameIndex + 1} 局）`
              : ""}
          </p>
          <button
            type="button"
            className="casual-game-tour__resumeBtn"
            disabled={resumeOpening || joiningId !== null}
            onClick={handleOngoingEnter}
          >
            {resumeOpening ? "…" : "继续"}
          </button>
        </div>
      ) : queueClaiming ? (
        <div className="casual-game-tour__resume casual-game-tour__resume--queue" role="status">
          <p className="casual-game-tour__resumeText">正在创建对局，请稍候…</p>
        </div>
      ) : queueWaiting ? (
        <div className="casual-game-tour__resume casual-game-tour__resume--queue" role="status">
          <p className="casual-game-tour__resumeText">
            正在匹配中
            {primaryQueueTitle ? `（${primaryQueueTitle}）` : ""}
          </p>
          <button
            type="button"
            className="casual-game-tour__resumeBtn casual-game-tour__resumeBtn--leave"
            disabled={leavingMatch || joiningId !== null}
            onClick={() => void handleLeaveMatchQueue()}
          >
            {leavingMatch ? "…" : "退出匹配"}
          </button>
        </div>
      ) : null}
      <div className="casual-game-tour__list">
        {rows.map((row) => (
          <div key={row.tournamentId} className="casual-game-tour__item">
            <span className={badgeClass(row.matchType)}>{badgeLabel(row.matchType)}</span>
            <div className="casual-game-tour__main">
              <p className="casual-game-tour__itemTitle">{row.title}</p>
              <p className="casual-game-tour__meta">入场：{row.entryLabel}</p>
              <p className="casual-game-tour__meta casual-game-tour__meta--sub">
                3 局连续 · 总分决胜负
              </p>
            </div>
            <button
              type="button"
              className="casual-game-tour__play"
              disabled={joiningId === row.tournamentId || playBlocked}
              onClick={() => void handlePlay(row)}
            >
              {joiningId === row.tournamentId ? "..." : "Play"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatEntryLabel(
  activities: ReturnType<typeof useCasualPlatform>["activities"],
  tournamentId: string,
  def: CasualTournamentDefinition | null
): string {
  const entry = def?.entry;
  if (!entry) return "—";
  if (entry.kind === "none") return "免费";
  if (entry.kind === "coins") {
    const pv = previewCoinsCost(activities, { tournamentId }, entry.amount);
    return pv.changed ? `${entry.amount}→${pv.effective} 金币` : `${entry.amount} 金币`;
  }
  if (entry.kind === "gems") {
    const pv = previewGemsCost(activities, { tournamentId }, entry.amount);
    return pv.changed ? `${entry.amount}→${pv.effective} 钻` : `${entry.amount} 钻`;
  }
  const pv = previewVoucherCost(activities, { tournamentId }, entry.amount);
  return pv.changed ? `${entry.amount}→${pv.effective} 赛季券` : `${entry.amount} 赛季券`;
}

export default CasualTriathlonLobbyModal;
