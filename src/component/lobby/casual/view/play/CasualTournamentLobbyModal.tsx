import {
  getDefaultCasualTournaments,
  getTournamentDefinition,
  shouldAppearInCasualPlayLobby,
  type CasualTournamentDefinition,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { ModalProp, useModalManager } from "host/service/ModalManager";
import React, { useCallback, useMemo, useState } from "react";

import {
  casualGameKindFromGameType,
  casualGameKindDisplayName,
  casualPlayModalForKind,
  hasAnyOpenCasualRunAssignment,
  inferCasualGameKindFromAssignment,
  seasonChallengeTournamentIdForKind,
  type CasualGameKind,
  type CasualPlayModalName,
  type OpenCasualRunAssignment,
} from "../../service/casualOpenRunAssignment";
import {
  type AwaitOpenCasualRunMatchWatch,
  useAwaitOpenCasualRunAssignment,
} from "../../service/useAwaitOpenCasualRunAssignment";
import { useSyncedLatestOpenCasualAssignment } from "../../service/useSyncedLatestOpenCasualAssignment";
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
  matchType:
    | "tournament_a"
    | "tournament_b"
    | "tournament_c"
    | "season_challenge"
    | "solo_p75_challenge";
  entryLabel: string;
  periodHint?: string;
}

function badgeLabel(matchType: TournamentRow["matchType"]): string {
  if (matchType === "tournament_a") return "A";
  if (matchType === "tournament_b") return "B";
  if (matchType === "season_challenge") return "专场";
  if (matchType === "solo_p75_challenge") return "P75";
  return "C";
}

function badgeClass(matchType: TournamentRow["matchType"]): string {
  if (matchType === "tournament_a") return "casual-game-tour__badge casual-game-tour__badge--a";
  if (matchType === "tournament_b") return "casual-game-tour__badge casual-game-tour__badge--b";
  if (matchType === "season_challenge")
    return "casual-game-tour__badge casual-game-tour__badge--season";
  if (matchType === "solo_p75_challenge")
    return "casual-game-tour__badge casual-game-tour__badge--p75";
  return "casual-game-tour__badge casual-game-tour__badge--c";
}

const CasualTournamentLobbyModal: React.FC<ModalProp> = ({ visible, data, close }) => {
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [resumeOpening, setResumeOpening] = useState(false);
  const [awaitingMatch, setAwaitingMatch] = useState<AwaitOpenCasualRunMatchWatch | null>(null);
  const [leavingMatch, setLeavingMatch] = useState(false);
  const latestOpenAssignment = useSyncedLatestOpenCasualAssignment({
    enabled: visible && Boolean(casual.convexUrl),
    openRunAssignments: casual.openRunAssignments,
  });
  const targetGameKind: CasualGameKind = casualGameKindFromGameType(
    typeof data?.gameType === "string" ? data.gameType : undefined
  );
  const gameTitle =
    typeof data?.gameTitle === "string" ? data.gameTitle : casualGameKindDisplayName(targetGameKind);

  const rows = useMemo(() => {
    const tournaments = casual.tournaments.length > 0 ? casual.tournaments : getDefaultCasualTournaments();
    const baseRows = tournaments
      .filter((t) => {
        const def = getTournamentDefinition(t.tournamentId);
        return def?.gameType === targetGameKind && shouldAppearInCasualPlayLobby(def);
      })
      .map((t) => {
        const def = getTournamentDefinition(t.tournamentId);
        const periodHint =
          def?.instanceScope && def.instanceScope !== "single_match"
            ? `周期 ${def.instanceScope} · 榜 ${def.scoreAggregation ?? "best_score"} · 入场 ${
                def.entryBilling === "per_instance" ? "每周期一次" : "每局"
              }`
            : undefined;
        return {
          tournamentId: t.tournamentId,
          title: t.title,
          matchType: (def?.matchType ?? "tournament_a") as TournamentRow["matchType"],
          entryLabel: formatEntryLabel(casual.activities, t.tournamentId, def),
          periodHint,
        };
      });
    const seasonTournamentId = seasonChallengeTournamentIdForKind(targetGameKind);
    const hasSeasonChallenge = baseRows.some((row) => row.matchType === "season_challenge");
    if (hasSeasonChallenge) return baseRows;
    const seasonDef = getTournamentDefinition(seasonTournamentId);
    if (!seasonDef || seasonDef.gameType !== targetGameKind) return baseRows;
    return [
      ...baseRows,
      {
        tournamentId: seasonDef.tournamentId,
        title: seasonDef.title,
        matchType: "season_challenge",
        entryLabel: formatEntryLabel(casual.activities, seasonDef.tournamentId, seasonDef),
        periodHint: undefined,
      },
    ];
  }, [casual.activities, casual.tournaments, targetGameKind]);

  /** 须晚于 `useModalAnimate` 的 swipe 关窗时长（~460ms），否则栈顶仍是锦标赛层、`openModal` 易被挡住或表现为无反应 */
  const OPEN_GAME_AFTER_CLOSE_MS = 520;

  const openAfterClose = (modalName: CasualPlayModalName, modalData?: Record<string, unknown>) => {
    close();
    window.setTimeout(() => {
      setNote(null);
      openModal({ name: modalName, data: modalData });
    }, OPEN_GAME_AFTER_CLOSE_MS);
  };

  const handleOngoingEnter = () => {
    const hit = latestOpenAssignment;
    if (!hit || resumeOpening || joiningId !== null) return;
    setResumeOpening(true);
    window.setTimeout(() => setResumeOpening(false), OPEN_GAME_AFTER_CLOSE_MS + 200);
    const kind = inferCasualGameKindFromAssignment(hit);
    openAfterClose(casualPlayModalForKind(kind), {
      casualTournamentId: hit.templateId,
      casualMatchGameId: hit.gameId,
    });
  };

  const openMatchedAssignment = useCallback(
    (hit: OpenCasualRunAssignment, templateId: string) => {
      const kind = inferCasualGameKindFromAssignment(hit);
      setNote("已入场，正在进入对局...");
      openAfterClose(casualPlayModalForKind(kind), {
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
  const hasOpenRun = latestOpenAssignment != null;
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
        setAwaitingMatch({ templateId: row.tournamentId, gameKind: targetGameKind });
        setJoiningId(null);
        close();
        return;
      }
      if (outcome.kind === "ready") {
        setNote("已入场，正在进入对局...");
        openAfterClose(casualPlayModalForKind(targetGameKind), {
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
        <h2 className="casual-game-tour__title">{gameTitle} 锦标赛</h2>
        <p className="casual-game-tour__sub">A / B / C / P75</p>
      </div>
      {note ? <p className="casual-game-tour__note">{note}</p> : null}
      {hasOpenRun ? (
        <div className="casual-game-tour__resume" role="status">
          <p className="casual-game-tour__resumeText">有一场正在进行中的对局</p>
          <button
            type="button"
            className="casual-game-tour__resumeBtn"
            disabled={resumeOpening || joiningId !== null}
            onClick={handleOngoingEnter}
          >
            {resumeOpening ? "…" : "进入"}
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
              {row.periodHint ? <p className="casual-game-tour__meta casual-game-tour__meta--sub">{row.periodHint}</p> : null}
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

export default CasualTournamentLobbyModal;
