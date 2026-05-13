import {
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { PageProp } from "host/RenderApp";
import { CASUAL_FOOTER_NAV_URI } from "component/lobby/casual/control/FooterNavCasual";
import { setCasualLeaderboardsNavIntent } from "component/lobby/casual/view/leaderboards/casualLeaderboardNavIntent";
import { useModalManager } from "host/service/ModalManager";
import { usePageManager } from "host/service/PageManager";
import React, { useCallback, useRef, useState } from "react";

import {
  assignmentMatchesGameKind,
  hasAnyOpenCasualRunAssignment,
  inferCasualGameKindFromAssignment,
  type CasualGameKind,
  type OpenCasualRunAssignment,
} from "../../service/casualOpenRunAssignment";
import { useSyncedLatestOpenCasualAssignment } from "../../service/useSyncedLatestOpenCasualAssignment";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import CasualPageShell from "../shell/CasualPageShell";
import "./casualPlayTab.css";

/** Play：任务列表 · 按「单人挑战 / 多人竞技」分组，各含 Solitaire 与 Block Blast */
const CasualPlayTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const { openPage } = usePageManager();
  const latestOpenAssignment = useSyncedLatestOpenCasualAssignment({
    enabled: visible !== 0 && Boolean(casual.convexUrl),
    fetchAssignments: casual.fetchOpenCasualRunAssignments,
  });

  const [joiningSolo, setJoiningSolo] = useState<CasualGameKind | null>(null);
  const [soloNote, setSoloNote] = useState<string | null>(null);

  const coins = casual.casualPlayer?.coins;
  const gems = casual.casualPlayer?.gems;
  const vouchers =
    casual.passProgress?.seasonVouchers ?? casual.casualPlayer?.seasonVouchers;

  const openTasksSheet = () => {
    openModal({ name: "casual_tasks_sheet" });
  };

  const openGameTournaments = (gameId: "solitaire" | "block_blast", gameTitle: string) => {
    openModal({
      name: "casual_game_tournaments",
      data: { gameId, gameTitle },
    });
  };

  const openSeasonLeaderboards = () => {
    setCasualLeaderboardsNavIntent("mainSeason");
    openPage({ uri: CASUAL_FOOTER_NAV_URI[4] });
  };

  const joinSoloDailyChallenge = useCallback(
    async (kind: CasualGameKind) => {
      if (!casual.convexUrl) return;
      setSoloNote(null);
      const tournamentId =
        kind === "solitaire"
          ? CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID
          : CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID;
      const gate = (await casual.fetchOpenCasualRunAssignments()) as OpenCasualRunAssignment[];
      if (hasAnyOpenCasualRunAssignment(gate)) {
        setSoloNote("有未结束的锦标对局，请先完成后再开始新挑战。");
        return;
      }
      setJoiningSolo(kind);
      try {
        const r = await casual.joinTournament(tournamentId);
        if (!r?.ok) {
          setSoloNote(`加入失败：${(r as { error?: string })?.error ?? "未知错误"}`);
          return;
        }
        const openGame = (gameId: string) => {
          openModal({
            name: kind === "solitaire" ? "play_solitaire_solo" : "play_block_blast",
            data: {
              casualTournamentId: tournamentId,
              casualMatchGameId: gameId,
            },
          });
        };
        if ("queued" in r && r.queued) {
          const deadline = Date.now() + 90_000;
          while (Date.now() < deadline) {
            await new Promise((res) => window.setTimeout(res, 450));
            const assigns = (await casual.fetchOpenCasualRunAssignments()) as OpenCasualRunAssignment[];
            const hit = assigns.find(
              (a) => a.templateId === tournamentId && assignmentMatchesGameKind(a, kind)
            );
            if (hit) {
              openGame(hit.gameId);
              await casual.refreshCasualPlayer();
              return;
            }
          }
          setSoloNote("匹配超时，请稍后重试。");
          await casual.refreshCasualPlayer();
          return;
        }
        if ("gameId" in r && r.gameId) {
          openGame(r.gameId);
          await casual.refreshCasualPlayer();
        }
      } finally {
        setJoiningSolo(null);
      }
    },
    [
      casual.convexUrl,
      casual.fetchOpenCasualRunAssignments,
      casual.joinTournament,
      casual.refreshCasualPlayer,
      openModal,
    ]
  );

  const openOngoingGame = useCallback(() => {
    const hit = latestOpenAssignment;
    if (!hit) return;
    const kind = inferCasualGameKindFromAssignment(hit);
    openModal({
      name: kind === "solitaire" ? "play_solitaire_solo" : "play_block_blast",
      data: {
        casualTournamentId: hit.templateId,
        casualMatchGameId: hit.gameId,
      },
    });
  }, [latestOpenAssignment, openModal]);

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

          {latestOpenAssignment ? (
            <div className="casual-play-hub__ongoingRow" role="status">
              <p className="casual-play-hub__ongoingRowText">有一场正在进行中的对局</p>
              <button type="button" className="casual-play-hub__ongoingEnter" onClick={openOngoingGame}>
                进入
              </button>
            </div>
          ) : null}

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-task-row">
            <h2 id="casual-play-hub-task-row" className="casual-play-hub__rowTitle">
              任务
            </h2>
            <button type="button" className="casual-play-hub__taskStrip" onClick={openTasksSheet}>
              <span className="casual-play-hub__taskStripMain">
                <span className="casual-play-hub__taskStripTitle">任务列表</span>
                <span className="casual-play-hub__taskStripSub">{missionSummary}</span>
              </span>
              <span className="casual-play-hub__taskStripChev" aria-hidden>
                ›
              </span>
            </button>
          </section>

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-solo">
            <h2 id="casual-play-hub-solo" className="casual-play-hub__rowTitle">
              单人挑战
            </h2>
            {soloNote ? <p className="casual-play-hub__soloNote">{soloNote}</p> : null}
            <div className="casual-play-hub__gameGrid casual-play-hub__gameGrid--pair">
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--solitaire" aria-hidden>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♦</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--black">♠</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♥</span>
                </div>
                <p className="casual-play-hub__modeTitle">Solitaire</p>
                <p className="casual-play-hub__gameHint">日榜最高分 · 免费入场</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn"
                    disabled={!!latestOpenAssignment || joiningSolo !== null}
                    onClick={() => void joinSoloDailyChallenge("solitaire")}
                  >
                    {joiningSolo === "solitaire" ? "…" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    onClick={() =>
                      openModal({
                        name: "casual_daily_solo_leaderboard",
                        data: { gameKind: "solitaire" as const },
                      })
                    }
                  >
                    当日排行榜
                  </button>
                </div>
              </div>
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--blast" aria-hidden />
                <p className="casual-play-hub__modeTitle">Block Blast</p>
                <p className="casual-play-hub__gameHint">日榜最高分 · 免费入场</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn"
                    disabled={!!latestOpenAssignment || joiningSolo !== null}
                    onClick={() => void joinSoloDailyChallenge("block_blast")}
                  >
                    {joiningSolo === "block_blast" ? "…" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    onClick={() =>
                      openModal({
                        name: "casual_daily_solo_leaderboard",
                        data: { gameKind: "block_blast" as const },
                      })
                    }
                  >
                    当日排行榜
                  </button>
                </div>
              </div>
            </div>
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
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C 专场</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={!!latestOpenAssignment}
                    onClick={() => openGameTournaments("solitaire", "Solitaire")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    onClick={openSeasonLeaderboards}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--blast" aria-hidden />
                <p className="casual-play-hub__modeTitle">Block Blast</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C 专场</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={!!latestOpenAssignment}
                    onClick={() => openGameTournaments("block_blast", "Block Blast")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    onClick={openSeasonLeaderboards}
                  >
                    赛季排行榜
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
