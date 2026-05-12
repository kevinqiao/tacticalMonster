import {
  CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
  getDefaultCasualTournaments,
  getTournamentDefinition,
  type CasualTournamentDefinition,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { ModalProp, useModalManager } from "host/service/ModalManager";
import React, { useMemo, useState } from "react";

import {
  assignmentMatchesGameKind,
  hasAnyOpenCasualRunAssignment,
  inferCasualGameKindFromAssignment,
  type CasualGameKind,
} from "../../service/casualOpenRunAssignment";
import { useSyncedLatestOpenCasualAssignment } from "../../service/useSyncedLatestOpenCasualAssignment";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import {
  previewCoinsCost,
  previewGemsCost,
  previewVoucherCost,
} from "../shared/casualActivityUi";
import "./casualTournamentLobbyModal.css";

interface TournamentRow {
  tournamentId: string;
  title: string;
  matchType: "tournament_a" | "tournament_b" | "tournament_c" | "season_challenge";
  entryLabel: string;
  periodHint?: string;
}

function badgeLabel(matchType: TournamentRow["matchType"]): string {
  if (matchType === "tournament_a") return "A";
  if (matchType === "tournament_b") return "B";
  if (matchType === "season_challenge") return "专场";
  return "C";
}

function badgeClass(matchType: TournamentRow["matchType"]): string {
  if (matchType === "tournament_a") return "casual-game-tour__badge casual-game-tour__badge--a";
  if (matchType === "tournament_b") return "casual-game-tour__badge casual-game-tour__badge--b";
  if (matchType === "season_challenge")
    return "casual-game-tour__badge casual-game-tour__badge--season";
  return "casual-game-tour__badge casual-game-tour__badge--c";
}

const CasualTournamentLobbyModal: React.FC<ModalProp> = ({ visible, data, close }) => {
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [resumeOpening, setResumeOpening] = useState(false);
  const fetchOpenAssignments = casual.fetchOpenCasualRunAssignments;
  const latestOpenAssignment = useSyncedLatestOpenCasualAssignment({
    enabled: visible && Boolean(casual.convexUrl),
    fetchAssignments: fetchOpenAssignments,
  });
  const targetGameKind: CasualGameKind = data?.gameId === "solitaire" ? "solitaire" : "block_blast";
  const gameTitle =
    typeof data?.gameTitle === "string"
      ? data.gameTitle
      : targetGameKind === "solitaire"
        ? "Solitaire"
        : "Block Blast";

  const rows = useMemo(() => {
    const tournaments = casual.tournaments.length > 0 ? casual.tournaments : getDefaultCasualTournaments();
    const baseRows = tournaments
      .filter((t) => {
        const def = getTournamentDefinition(t.tournamentId);
        return (
          def?.gameId === targetGameKind &&
          (def.matchType === "tournament_a" ||
            def.matchType === "tournament_b" ||
            def.matchType === "tournament_c" ||
            def.matchType === "season_challenge")
        );
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
    if (targetGameKind !== "block_blast") return baseRows;
    const hasSeasonChallenge = baseRows.some((row) => row.matchType === "season_challenge");
    if (hasSeasonChallenge) return baseRows;
    const seasonDef = getTournamentDefinition(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID);
    if (!seasonDef || seasonDef.gameId !== "block_blast") return baseRows;
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

  const openAfterClose = (modalName: "play_solitaire_solo" | "play_block_blast", modalData?: Record<string, unknown>) => {
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
    openAfterClose(kind === "solitaire" ? "play_solitaire_solo" : "play_block_blast", {
      casualTournamentId: hit.templateId,
      casualMatchGameId: hit.gameId,
    });
  };

  const handlePlay = async (row: TournamentRow) => {
    const gate = (await casual.fetchOpenCasualRunAssignments()) as OpenCasualRunAssignment[];
    if (hasAnyOpenCasualRunAssignment(gate)) {
      setNote("有未结束的锦标对局，请先完成后再加入新场。");
      return;
    }
    setJoiningId(row.tournamentId);
    try {
      const r = await casual.joinTournament(row.tournamentId);
      if (r?.ok && "queued" in r && r.queued) {
        setNote("匹配中，正在为你创建对局…");
        const deadline = Date.now() + 90_000;
        while (Date.now() < deadline) {
          await new Promise((res) => window.setTimeout(res, 450));
          const assigns = (await casual.fetchOpenCasualRunAssignments()) as OpenCasualRunAssignment[];
          const hit = assigns.find(
            (a) =>
              a.templateId === row.tournamentId && assignmentMatchesGameKind(a, targetGameKind)
          );
          if (hit) {
            setNote("已入场，正在进入对局...");
            openAfterClose(
              targetGameKind === "solitaire" ? "play_solitaire_solo" : "play_block_blast",
              {
                casualTournamentId: row.tournamentId,
                casualMatchGameId: hit.gameId,
              }
            );
            await casual.refreshCasualPlayer();
            return;
          }
        }
        setNote("仍在排队或匹配超时，请稍后重试。");
        await casual.refreshCasualPlayer();
        return;
      }
      if (r?.ok && "gameId" in r && r.gameId) {
        setNote("已入场，正在进入对局...");
        openAfterClose(
          targetGameKind === "solitaire" ? "play_solitaire_solo" : "play_block_blast",
          {
            casualTournamentId: row.tournamentId,
            casualMatchGameId: r.gameId,
          }
        );
      } else {
        setNote(`加入失败：${(r as { error?: string })?.error ?? "未知错误"}`);
      }
      await casual.refreshCasualPlayer();
    } finally {
      setJoiningId(null);
    }
  };

  if (!visible) return null;
  return (
    <div className="casual-game-tour">
      <div className="casual-game-tour__head">
        <h2 className="casual-game-tour__title">{gameTitle} 锦标赛</h2>
        <p className="casual-game-tour__sub">A / B / C 专场列表</p>
      </div>
      {note ? <p className="casual-game-tour__note">{note}</p> : null}
      {latestOpenAssignment ? (
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
              disabled={joiningId === row.tournamentId || latestOpenAssignment !== null}
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
