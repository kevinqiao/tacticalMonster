import { getTournamentDefinition } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import CasualSkinEquipPanel from "component/battle/games/shared/visualTheme/CasualSkinEquipPanel";
import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import { usePageManager } from "host/service/PageManager";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  assignmentMatchesAwaitWatch,
  awaitWatchGameKindForTemplate,
  casualPlayModalForAssignment,
  modalDataForOpenAssignment,
  isCasualGameKindLobbyVisible,
  type CasualGameKind,
} from "../../service/casualOpenRunAssignment";
import {
  CASUAL_MATCH_OPEN_TIMEOUT_MS,
  type AwaitOpenCasualRunMatchWatch,
  useAwaitOpenCasualRunAssignment,
} from "../../service/useAwaitOpenCasualRunAssignment";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { casualLadderTierLabel } from "./casualSeasonLadderLabels";
import { useSyncedLatestOpenCasualAssignment } from "../../service/useSyncedLatestOpenCasualAssignment";
import CasualDailyGrowthPanel from "./CasualDailyGrowthPanel";
import CasualPageShell from "../shell/CasualPageShell";
import CasualPlayMatchOverlay from "./CasualPlayMatchOverlay";
import "./casualPlayTab.css";

/** Play：任务 · 多人竞技（含 P75）· 三场合战 */
const CasualPlayTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const { openPage } = usePageManager();
  const latestOpenAssignment = useSyncedLatestOpenCasualAssignment({
    enabled: visible !== 0 && Boolean(casual.convexUrl),
    openRunAssignments: casual.openRunAssignments,
  });

  /** A/B/C 异步场：队列消失后仍订阅 openRunAssignments 直至开桌或超时 */
  const [awaitingAsyncMatch, setAwaitingAsyncMatch] = useState<AwaitOpenCasualRunMatchWatch | null>(null);
  const [hubNote, setHubNote] = useState<string | null>(null);
  const [leavingMatch, setLeavingMatch] = useState(false);

  const coins = casual.casualPlayer?.coins;
  const gems = casual.casualPlayer?.gems;
  const vouchers =
    casual.passProgress?.seasonVouchers ?? casual.casualPlayer?.seasonVouchers;
  const weeklyLeague = casual.weeklyLeagueSnapshot;
  const towerLobbyVisible = isCasualGameKindLobbyVisible("tower_arena");
  const didEnsureWeeklyLeagueRef = useRef(false);

  useEffect(() => {
    if (visible === 0) {
      didEnsureWeeklyLeagueRef.current = false;
      return;
    }
    if (!casual.convexUrl || didEnsureWeeklyLeagueRef.current) return;
    didEnsureWeeklyLeagueRef.current = true;
    void casual.ensureWeeklyLeagueMember();
  }, [visible, casual.convexUrl, casual.ensureWeeklyLeagueMember]);

  const openTasksSheet = () => {
    openModal({ name: "casual_tasks_sheet" });
  };

  const openGameTournaments = (gameType: CasualGameKind, gameTitle: string) => {
    openModal({
      name: "casual_game_tournaments",
      data: { gameType, gameTitle },
    });
  };

  const openTriathlonLobby = () => {
    openModal({
      name: "casual_triathlon_lobby",
      data: {},
    });
  };

  const openWeeklyLeague = () => {
    openModal({
      name: "casual_weekly_league",
      data: {},
    });
  };

  useEffect(() => {
    if (!visible || !weeklyLeague?.unreadCloseResult) return;
    openModal({
      name: "casual_weekly_league_close",
      data: {
        outcome: weeklyLeague.lastOutcome,
        pendingRewards: weeklyLeague.pendingRewards,
      },
    });
  }, [visible, weeklyLeague?.unreadCloseResult, weeklyLeague?.lastOutcome, weeklyLeague?.pendingRewards, openModal]);

  const openMatchedAssignment = useCallback(
    (hit: Parameters<typeof modalDataForOpenAssignment>[0]) => {
      openModal({
        name: casualPlayModalForAssignment(hit),
        data: modalDataForOpenAssignment(hit),
      });
    },
    [openModal]
  );

  useAwaitOpenCasualRunAssignment({
    watch: awaitingAsyncMatch,
    enabled: visible !== 0 && awaitingAsyncMatch != null,
    timeoutMs: CASUAL_MATCH_OPEN_TIMEOUT_MS + 15_000,
    openRunAssignments: casual.openRunAssignments,
    onMatched: (hit) => {
      if (!awaitingAsyncMatch) return;
      setAwaitingAsyncMatch(null);
      setHubNote(null);
      void casual.refreshCasualPlayer();
      openMatchedAssignment(hit);
    },
    onTimeout: () => {
      setAwaitingAsyncMatch(null);
      setHubNote("匹配超时，请稍后重试。");
      void casual.refreshCasualPlayer();
    },
  });

  const openOngoingGame = useCallback(() => {
    const hit = latestOpenAssignment;
    if (!hit) return;
    openMatchedAssignment(hit);
  }, [latestOpenAssignment, openMatchedAssignment]);

  const queue = casual.matchQueueEntries;
  const queueWaiting = queue.some((e) => e.status === "waiting");
  const queueClaiming = queue.some((e) => e.status === "claiming");
  const primaryQueueEntry = queue[0];

  useEffect(() => {
    const entry = primaryQueueEntry;
    if (entry && (entry.status === "waiting" || entry.status === "claiming")) {
      setAwaitingAsyncMatch({
        templateId: entry.templateId,
        gameKind: awaitWatchGameKindForTemplate(entry.templateId),
      });
    }
  }, [primaryQueueEntry?.templateId, primaryQueueEntry?.status]);

  /** 开桌已完成但队列仍短暂显示 claiming 时，直接进 triathlon / 异步场 */
  useEffect(() => {
    if (!awaitingAsyncMatch) return;
    const hit = casual.openRunAssignments.find((a) =>
      assignmentMatchesAwaitWatch(a, awaitingAsyncMatch)
    );
    if (!hit) return;
    setAwaitingAsyncMatch(null);
    setHubNote(null);
    void casual.refreshCasualPlayer();
    openMatchedAssignment(hit);
  }, [awaitingAsyncMatch, casual.openRunAssignments, casual.refreshCasualPlayer, openMatchedAssignment]);

  const hasOpenRun = latestOpenAssignment != null;
  const matchOverlayOpen =
    awaitingAsyncMatch != null || queueWaiting || queueClaiming;
  const playBlocked = hasOpenRun || matchOverlayOpen;
  const primaryQueueTitle = primaryQueueEntry
    ? getTournamentDefinition(primaryQueueEntry.templateId)?.title ?? primaryQueueEntry.templateId
    : "";

  const leaveMatchQueueErrorText = (error: string): string => {
    if (error === "cannot_leave_claiming") return "正在创建对局，请稍候…";
    if (error === "not_in_queue") return "当前不在匹配队列中。";
    return `退出失败：${error}`;
  };

  const handleLeaveMatchQueue = useCallback(async () => {
    if (leavingMatch || !queueWaiting) return;
    setLeavingMatch(true);
    try {
      const res = await casual.leaveCasualMatchQueue(primaryQueueEntry?.templateId);
      setAwaitingAsyncMatch(null);
      if (res.ok) {
        setHubNote(null);
      } else {
        setHubNote(leaveMatchQueueErrorText(res.error));
      }
    } finally {
      setLeavingMatch(false);
    }
  }, [casual.leaveCasualMatchQueue, leavingMatch, primaryQueueEntry?.templateId, queueWaiting]);

  const missionSummary =
    casual.missions.length > 0 ? `${casual.missions.length} 项进行中` : "查看赛季任务与进度";

  return (
    <CasualPageShell
      title="Play"
      titleId="casual-tab-play"
      rootRef={rootRef}
      visible={visible}
      showHeader={true}
    >
      {!casual.convexUrl ? (
        <div className="casual-play-hub">
          <div className="casual-play-hub__offline">
            配置 <code>VITE_CONVEX_URL_CASUAL</code> 后可同步锦标赛与任务。
          </div>
        </div>
      ) : (
        <div className="casual-play-hub">
          <div className="casual-play-hub__balances" aria-label="当前资产">
            {typeof coins === "number" ? (
              <span className="casual-play-hub__chip">
                金币 <b>{coins}</b>
              </span>
            ) : null}
            {typeof gems === "number" ? (
              <span className="casual-play-hub__chip">
                钻 <b>{gems}</b>
              </span>
            ) : null}
            {typeof vouchers === "number" ? (
              <span className="casual-play-hub__chip">
                赛季券 <b>{vouchers}</b>
              </span>
            ) : null}
          </div>

          <CasualDailyGrowthPanel progress={casual.dailyGrowthProgress} />

          <CasualSkinEquipPanel gameId="solitaire" />

          {weeklyLeague ? (
            <div className="casual-play-hub__ladder casual-play-hub__weeklyLeague" aria-label="周联赛">
              <div className="casual-play-hub__ladderStats">
                <span className="casual-play-hub__ladderStat">
                  段位 <b>{casualLadderTierLabel(weeklyLeague.leagueTierId)}</b>
                </span>
                <span className="casual-play-hub__ladderStat">
                  当周 XP <b>{weeklyLeague.weeklyLeagueXp.toLocaleString()}</b>
                </span>
                <span className="casual-play-hub__ladderStat">
                  排名 <b>{weeklyLeague.cohortRank > 0 ? weeklyLeague.cohortRank : "—"}</b>
                  {weeklyLeague.cohortSize > 0 ? (
                    <span className="casual-play-hub__ladderStatMuted"> / {weeklyLeague.cohortSize}</span>
                  ) : null}
                </span>
              </div>
              <button
                type="button"
                className="casual-play-hub__ladderRankBtn"
                disabled={playBlocked}
                onClick={openWeeklyLeague}
              >
                周联赛
              </button>
            </div>
          ) : null}

          {hasOpenRun ? (
            <div className="casual-play-hub__ongoingRow" role="status">
              <p className="casual-play-hub__ongoingRowText">有一场正在进行中的对局</p>
              <button type="button" className="casual-play-hub__ongoingEnter" onClick={openOngoingGame}>
                进入
              </button>
            </div>
          ) : null}

          {hubNote ? <p className="casual-play-hub__soloNote">{hubNote}</p> : null}

          <CasualPlayMatchOverlay
            open={visible !== 0 && !hasOpenRun && matchOverlayOpen}
            phase={queueClaiming ? "claiming" : "waiting"}
            waitingForPeer={
              awaitingAsyncMatch != null && !queueWaiting && !queueClaiming
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

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-task-row">
            <h2 id="casual-play-hub-task-row" className="casual-play-hub__rowTitle">
              任务
            </h2>
            <button
              type="button"
              className="casual-play-hub__taskStrip"
              disabled={playBlocked}
              onClick={openTasksSheet}
            >
              <span className="casual-play-hub__taskStripMain">
                <span className="casual-play-hub__taskStripTitle">任务列表</span>
                <span className="casual-play-hub__taskStripSub">{missionSummary}</span>
              </span>
              <span className="casual-play-hub__taskStripChev" aria-hidden>
                ›
              </span>
            </button>
          </section>

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-multi">
            <h2 id="casual-play-hub-multi" className="casual-play-hub__rowTitle">
              多人竞技
            </h2>
            <div className="casual-play-hub__gameGrid casual-play-hub__gameGrid--pair">
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--solitaire" aria-hidden>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♦</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--black">♠</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♥</span>
                </div>
                <p className="casual-play-hub__modeTitle">Solitaire</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C / P75</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={() => openGameTournaments("solitaire", "Solitaire")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    disabled={playBlocked}
                    onClick={openWeeklyLeague}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--blast" aria-hidden />
                <p className="casual-play-hub__modeTitle">Block Blast</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C / P75</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={() => openGameTournaments("block_blast", "Block Blast")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    disabled={playBlocked}
                    onClick={openWeeklyLeague}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--solitaire" aria-hidden />
                <p className="casual-play-hub__modeTitle">Match-3</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C / P75</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={() => openGameTournaments("match_3", "Match-3")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    disabled={playBlocked}
                    onClick={openWeeklyLeague}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--solitaire" aria-hidden />
                <p className="casual-play-hub__modeTitle">Yatz</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C / P75</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={() => openGameTournaments("yatz", "Yatz")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    disabled={playBlocked}
                    onClick={openWeeklyLeague}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
              {towerLobbyVisible ? (
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--blast" aria-hidden />
                <p className="casual-play-hub__modeTitle">Tower Defense</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C / P75</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={() => openGameTournaments("tower_arena", "Tower Defense")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    disabled={playBlocked}
                    onClick={openWeeklyLeague}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
              ) : null}
            </div>
          </section>

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-triathlon">
            <h2 id="casual-play-hub-triathlon" className="casual-play-hub__rowTitle">
              三场合战
            </h2>
            <div className="casual-play-hub__gameGrid casual-play-hub__gameGrid--pair">
              <div className="casual-play-hub__modeCard">
                <p className="casual-play-hub__modeTitle">Block Blast · Solitaire · Match-3</p>
                <p className="casual-play-hub__gameHint">
                  一局 session 连打 3 场，按总分排名 · A / B / C 专场
                </p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={openTriathlonLobby}
                  >
                    Enter
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </CasualPageShell>
  );
};

export default CasualPlayTab;
