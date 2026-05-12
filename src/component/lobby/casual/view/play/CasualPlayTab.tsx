import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import React, { useCallback, useRef } from "react";

import { inferCasualGameKindFromAssignment } from "../../service/casualOpenRunAssignment";
import { useSyncedLatestOpenCasualAssignment } from "../../service/useSyncedLatestOpenCasualAssignment";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import CasualPageShell from "../shell/CasualPageShell";
import "./casualPlayTab.css";

/** Play：任务列表 · 各游戏仅锦标赛入口（无单人挑战） */
const CasualPlayTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const latestOpenAssignment = useSyncedLatestOpenCasualAssignment({
    enabled: visible !== 0 && Boolean(casual.convexUrl),
    fetchAssignments: casual.fetchOpenCasualRunAssignments,
  });

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

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-solitaire">
            <h2 id="casual-play-hub-solitaire" className="casual-play-hub__rowTitle">
              Solitaire
            </h2>
            <div className="casual-play-hub__gameGrid">
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--solitaire" aria-hidden>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♦</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--black">♠</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♥</span>
                </div>
                <p className="casual-play-hub__modeTitle">锦标赛</p>
                <p className="casual-play-hub__gameHint">A / B / C 专场 · 异步计分</p>
                <button
                  type="button"
                  className="casual-play-hub__modeBtn"
                  disabled={!!latestOpenAssignment}
                  onClick={() => openGameTournaments("solitaire", "Solitaire")}
                >
                  Enter
                </button>
              </div>
            </div>
          </section>

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-bb">
            <h2 id="casual-play-hub-bb" className="casual-play-hub__rowTitle">
              Block Blast
            </h2>
            <div className="casual-play-hub__gameGrid">
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--blast" aria-hidden />
                <p className="casual-play-hub__modeTitle">锦标赛</p>
                <p className="casual-play-hub__gameHint">A / B / C 专场 · 异步计分</p>
                <button
                  type="button"
                  className="casual-play-hub__modeBtn"
                  disabled={!!latestOpenAssignment}
                  onClick={() => openGameTournaments("block_blast", "Block Blast")}
                >
                  Enter
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </CasualPageShell>
  );
};

export default CasualPlayTab;
