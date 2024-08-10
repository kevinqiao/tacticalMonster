import DollarIcon from "component/icons/DollarIcon";
import PlayersIcon from "component/icons/PlayersIcon";
import { Tournament } from "model/Tournament";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import useCoord from "service/TerminalManager";
import useTournamentManager from "service/TournamentManager";
import { useUserManager } from "service/UserManager";
import { getCurrentAppConfig } from "util/PageUtils";
import CountDown from "./CountDown";
import "./tournament.css";
interface Props {
  tournament?: Tournament;
}
const TournamentItem: React.FC<Props> = ({ tournament }) => {
  const { width, height } = useCoord();
  const { join } = useTournamentManager();
  const divRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(25);
  const { openPage } = usePageManager();
  const { user } = useUserManager();
  const [isOver, setOver] = useState<boolean>(false);
  const { partner } = usePartnerManager();

  const calculateFontSize = () => {
    if (divRef.current) {
      const divWidth = divRef.current.offsetWidth;
      const newFontSize = divWidth / 70;
      setFontSize(Math.round(newFontSize));
    }
  };
  useEffect(() => {
    calculateFontSize();
    window.addEventListener("resize", calculateFontSize);
    return () => {
      window.removeEventListener("resize", calculateFontSize);
    };
  }, []);
  useEffect(() => {
    if (!tournament || !user) return;
    if (tournament.closeTime && (tournament.type === 1 || tournament.type === 2)) {
      const gap = tournament.closeTime - Date.now() - user.timelag;
      setOver(gap < 0 ? true : false);
    }
  }, [tournament, user]);

  const joinTournament = useCallback(async () => {
    if (tournament && !isOver) {
      const rs = await join(tournament.id);
      console.log(rs);
    }
  }, [tournament, join, partner, isOver]);
  const openLeaderboard = useCallback(() => {
    if (tournament?.type) {
      const app = getCurrentAppConfig();
      openPage({ name: "leaderboard", app: app.name, data: { tournament } });
    }
  }, [tournament]);

  const render = useMemo(() => {
    return (
      <>
        {tournament ? (
          <div ref={divRef} className="tournament-item roboto-bold" style={{ width: width > height ? "90%" : "100%" }}>
            <div style={{ width: "20%" }}>
              <div className="tournament-trophy">
                <div style={{ height: 20 }}></div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: Math.max(fontSize + 5, 14), color: "yellow" }}>$40</span>
                </div>
                <div style={{ height: 10 }}></div>
                <div style={{ height: "25px" }}>
                  <span style={{ fontSize: Math.max(fontSize - 5, 10), color: "white" }}>PRIZE POOL</span>
                </div>
              </div>
            </div>
            <div className="tournament-summary">
              <div style={{ height: 10 }}></div>
              <div style={{ marginLeft: 20, textAlign: "left" }}>
                <span style={{ fontSize: Math.max(fontSize + 5, 14) }}>Tournament({tournament?.type})</span>
              </div>
              <div style={{ height: 20 }}></div>
              <div
                style={{ cursor: tournament.type ? "pointer" : "default", marginLeft: 20, width: "10%", minWidth: 120 }}
                onClick={openLeaderboard}
              >
                <PlayersIcon players={tournament?.participants} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                {tournament.type > 0 && !isOver ? (
                  <CountDown closeTime={tournament.closeTime} onOver={() => setOver(true)}></CountDown>
                ) : null}
                {(tournament.type === 1 || tournament.type === 2) && isOver ? <div>Closed</div> : null}
              </div>
            </div>
            <div className="tournament-entryfee">
              <DollarIcon amount={40} />
              {tournament ? (
                <div
                  className="play-tournament"
                  style={{ cursor: isOver ? "default" : "pointer", backgroundColor: isOver ? "grey" : "#5590f5" }}
                  onClick={joinTournament}
                >
                  <span style={{ fontSize: Math.max(fontSize - 5, 12), color: isOver ? "white" : "yellow" }}>PLAY</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </>
    );
  }, [fontSize, tournament, isOver]);
  return <>{render}</>;
};

export default TournamentItem;
