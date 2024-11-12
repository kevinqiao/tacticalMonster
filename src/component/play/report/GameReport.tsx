import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { BATTLE_LOAD } from "model/Constants";
import React, { useCallback, useEffect, useRef, useState } from "react";
// import usePageProp from "service/PagePropProvider";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/_generated/api";
import { useBattleManager } from "../../../service/BattleManager";
import "./report.css";
export interface GameReport {
  player?: { name: string; avatar: number };
  uid?: string;
  gameId: string;
  score?: number;
  rank?: number;
  assets?: { asset: number; amount: number }[];
}

const GameReport: React.FC = () => {
  const maskDivRef = useRef<HTMLDivElement | null>(null);
  const reportDivRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<HTMLElement | null>(null);
  const goalRef = useRef<HTMLElement | null>(null);
  const timeRef = useRef<HTMLElement | null>(null);
  const { load, battle, overReport, setOverReport } = useBattleManager();
  const [report, setReport] = useState<{ result: { base: number; time: number; goal: number }; score: number } | null>(
    null
  );

  const convex = useConvex();
  const { user } = useUserManager();

  const findReport = useCallback(async () => {
    if (battle && user) {
      const { uid, token } = user;
      const game = battle.games?.find((g) => g.uid === user.uid);
      if (game && uid && token) {
        const gameReport = await convex.action(api.games.findReport, {
          gameId: game.gameId,
          uid,
          token,
        });
        console.log(gameReport);
        setReport(gameReport);
      }
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
      },
    });
    tl.to(maskDivRef.current, { autoAlpha: 0, duration: 0.5 }).to(
      reportDivRef.current,
      { scale: 0, autoAlpha: 0, duration: 0.5 },
      "<"
    );
    tl.play();
  }, [battle]);

  useEffect(() => {
    if (load !== BATTLE_LOAD.REPLAY && overReport === 1) {
      openReport();
      findReport();
    }
  }, [load, overReport]);

  useEffect(() => {
    if (battle) gsap.to(reportDivRef.current, { autoAlpha: 0, scale: 0, duration: 0 });
  }, [battle]);

  const confirm = () => {
    closeReport();
    setOverReport(2);
  };
  return (
    <>
      <div ref={maskDivRef} className="mask_container"></div>
      <div ref={reportDivRef} className="report_container">
        <div className="report_body">
          <div className="report_content">
            <div
              style={{ width: "80%", display: "flex", justifyContent: "center", alignItems: "center", height: "15%" }}
            >
              <span style={{ fontSize: 20, color: "white" }}>Game Over</span>
            </div>

            {report && report.result ? (
              <div style={{ width: "80%", height: "70%" }}>
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, color: "white" }}>Base</span>
                  <span ref={baseRef} style={{ fontSize: 15, color: "white" }}>
                    {report.result.base}
                  </span>
                </div>
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, color: "white" }}>Goal</span>
                  <span ref={goalRef} style={{ fontSize: 15, color: "white" }}>
                    {report.result.goal}
                  </span>
                </div>
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, color: "white" }}>Time Bonus</span>
                  <span ref={timeRef} style={{ fontSize: 15, color: "white" }}>
                    {report.result.time}
                  </span>
                </div>
                <div style={{ height: 90 }} />
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, color: "white" }}>Total</span>
                  <span ref={timeRef} style={{ fontSize: 15, color: "white" }}>
                    {report.score}
                  </span>
                </div>
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "center", width: "80%" }}>
              <div className="collect_btn" onClick={confirm}>
                <span>Ok</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameReport;
