import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { BATTLE_LOAD } from "model/Constants";
import React, { useCallback, useEffect, useRef, useState } from "react";
import usePageProp from "service/PagePropProvider";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/_generated/api";
import { useBattleManager } from "../../../service/BattleManager";
import ReportItem from "./ReportItem";
import "./report.css";
export interface GameReport {
  player?: { name: string; avatar: number };
  uid?: string;
  gameId: string;
  score?: number;
  rank?: number;
  assets?: { asset: number; amount: number }[];
}

const BattleReport: React.FC = () => {
  const maskDivRef = useRef<HTMLDivElement | null>(null);
  const reportDivRef = useRef<HTMLDivElement | null>(null);
  const { load, battle, overReport } = useBattleManager();
  const [leaderboard, setLeaderboard] = useState<{
    type: number;
    score: number;
    points?: number;
    rank: number;
    uid: string;
  } | null>(null);
  const [report, setReport] = useState<{
    id: string;
    games?: GameReport[];
    leaderboards: { type: number; score: number; points?: number; rank: number; uid: string }[];
    toCollect?: number;
  } | null>(null);

  const { exit } = usePageProp();
  const convex = useConvex();
  const { user } = useUserManager();
  // console.log(report);
  const findReport = useCallback(async () => {
    if (battle && user) {
      const { uid, token } = user;
      const battleReport = await convex.action(api.battle.findReport, {
        battleId: battle.id,
        uid,
        token,
      });
      if (battleReport.games)
        battleReport.games.sort((a: any, b: any) => {
          if (typeof a.score === "undefined" && typeof b.score !== "undefined") return 1;
          if (typeof a.score !== "undefined" && typeof b.score === "undefined") return -1;
          if (a.score === b.score) return 0;
          return a.score > b.score ? -1 : 1;
        });
      if (battleReport.leaderboards) {
        const myboard = battleReport.leaderboards.find((l: any) => l.uid === user.uid);
        if (myboard) setLeaderboard(myboard);
      }
      setReport(battleReport);
    }
  }, [battle, user]);
  const openReport = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskDivRef.current, { autoAlpha: 0.7, duration: 1.0 }).to(
      reportDivRef.current,
      { scale: 1, autoAlpha: 1, duration: 1.0 },
      "<"
    );
    tl.play();
  }, [battle]);
  const closeReport = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
        exit();
      },
    });
    tl.to(maskDivRef.current, { autoAlpha: 0, duration: 0.3 }).to(
      reportDivRef.current,
      { scale: 0, autoAlpha: 1, duration: 0.3 },
      "<"
    );
    tl.play();
  }, [battle]);

  useEffect(() => {
    if (load !== BATTLE_LOAD.REPLAY && overReport >= 2) {
      openReport();
      findReport();
    }
  }, [load, overReport]);

  useEffect(() => {
    if (battle) gsap.to(reportDivRef.current, { autoAlpha: 0, scale: 0, duration: 0 });
  }, [battle]);
  const claim = () => {
    console.log("claim reward");
    closeReport();
  };
  return (
    <>
      <div ref={maskDivRef} className="mask_container"></div>

      <div ref={reportDivRef} className="report_container">
        <div className="report_body">
          <div className="report_content">
            <div style={{ height: "15%" }}></div>
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "70%", width: "100%" }}
            >
              {report?.games ? (
                <div className="items_container">
                  {report.games.map((r, index) => (
                    <ReportItem key={r.gameId} gameReport={r} rank={index + 1} />
                  ))}
                </div>
              ) : null}
              {leaderboard && leaderboard.type === 1 && (
                <div className="score_container">
                  <div style={{ color: "white" }}>score:{leaderboard.score}</div>
                  <div style={{ color: "white" }}>points:{leaderboard.points}</div>
                  <div style={{ color: "white" }}>rank:{leaderboard.rank}</div>
                </div>
              )}
              {leaderboard && leaderboard.type === 2 && (
                <div className="score_container">
                  <div style={{ color: "white" }}>Best Score:{leaderboard.score}</div>
                  <div style={{ color: "white" }}>Current Rank:{leaderboard.rank}</div>
                </div>
              )}
            </div>
            {report?.toCollect ? (
              <div className="collect_btn" onClick={claim}>
                <span>Collect</span>
              </div>
            ) : (
              <div className="collect_btn" onClick={exit}>
                <span>Ok</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BattleReport;
