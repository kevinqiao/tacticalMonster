import { useConvex } from "convex/react";
import { api } from "convex/tournament/convex/_generated/api";
import gsap from "gsap";
import React, { lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserManager } from "service/UserManager";
import MatchProvider, { useMatchManager } from "./MatchProvider";
import MatchReport from "./MatchReport";
import { GamePlayerProps, PlayerMatch } from "./MatchTypes";
import "./style.css";
import { MatchReportModel } from "./types";
// const http_url = "https://beloved-mouse-699.convex.site"

const GamePlayerCache = new Map<string, React.ComponentType<GamePlayerProps>>();
const gamePlayerMap: Record<string, () => Promise<any>> = {
  'solitaire': () => import('./games/solitaireSolo/battle/SoloGame'),
};
const ErrorComponent: React.FC<{ gameType: string; error?: Error }> = ({ gameType, error }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    color: '#666'
  }}>
    <h3>Component Load Error</h3>
    <p>Failed to load: {gameType}</p>
    {error && <p>Error: {error.message}</p>}
    <button onClick={() => window.location.reload()}>Reload Page</button>
  </div>
);

const getGamePlayerComponent = (gameType: string): React.ComponentType<GamePlayerProps> => {
  if (!GamePlayerCache.has(gameType)) {
    // 检查是否有静态映射
    if (gamePlayerMap[gameType]) {
      GamePlayerCache.set(gameType, lazy(() => {
        // console.log(`Loading component from static map: ${normalizedPath}`);
        return gamePlayerMap[gameType]().catch((error) => {
          console.error(`Failed to load component: ${gameType}`, error);
          return {
            default: (props: GamePlayerProps) => <ErrorComponent gameType={gameType} error={error} />
          };
        });
      }));
    } else {
      // 如果没有静态映射，使用动态导入
      GamePlayerCache.set(gameType, lazy(() => {
        console.log(`Loading component dynamically: ${gameType}`);
        return import(/* webpackChunkName: "component" */ gameType).catch((error) => {
          console.error(`Failed to load component: ${gameType}`, error);
          return {
            default: (props: GamePlayerProps) => <ErrorComponent gameType={gameType} error={error} />
          };
        });
      }));
    }
  }
  return GamePlayerCache.get(gameType)!;
};
export const MatchPlayer: React.FC<{ onGameLoadComplete?: () => void, onMatchOver?: () => void }> = ({ onGameLoadComplete, onMatchOver }) => {
  const { matchState } = useMatchManager();
  const reportRef = useRef<HTMLDivElement>(null);
  const [matchReport, setMatchReport] = useState<MatchReportModel | null>(null);
  const GamePlayerComponent = useMemo(() => getGamePlayerComponent(matchState?.gameType ?? 'solitaire'), [matchState]);
  const { updateUserData } = useUserManager();
  const convex = useConvex();
  useEffect(() => {
    console.log("MatchPlayer matchState", matchState);
    // if (matchState?.matchId) {
    //   updateUserData({ game: { name: matchState.gameType, matchId: matchState.matchId, gameId: matchState.gameId } });
    // }

  }, [matchState])
  const handleGameSubmit = useCallback(() => {
    if (matchState?.matchId && convex) {
      gsap.fromTo(reportRef.current, { autoAlpha: 1, scale: 0.5 }, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power2.inOut'
      });
      convex.query(api.service.tournament.matchManager.findReport, { matchId: matchState.matchId }).then((res) => {
        console.log("findReport result", res);
        setMatchReport(res as MatchReportModel);
      });
    }

  }, [matchState]);
  const onOK = useCallback(() => {
    gsap.to(reportRef.current, {
      autoAlpha: 0,
      scale: 0.5,
      duration: 0.5,
      ease: 'power2.inOut'
    });
    onMatchOver?.();
  }, [onMatchOver]);
  return (
    <>

      {matchState?.gameId && <GamePlayerComponent gameId={matchState.gameId} gameType={matchState.gameType ?? 'solitaire'} onGameLoadComplete={onGameLoadComplete} onGameSubmit={handleGameSubmit} />}
      <div ref={reportRef} id="match-report" className="match-report-container" ><MatchReport matchReport={matchReport} onOK={onOK} /></div>
    </>
  );
};
const MatchHome: React.FC<{ match: PlayerMatch | null, onGameLoadComplete: () => void, onMatchOver: () => void }> = (props) => {

  console.log("MatchHome match", props.match);
  if (!props.match) {
    return null;
  }
  return (
    // <ConvexProvider client={client}>
    <MatchProvider match={props.match}>
      <MatchPlayer onGameLoadComplete={props.onGameLoadComplete} onMatchOver={props.onMatchOver} />
    </MatchProvider>
    // </ConvexProvider>
  );
};

export default MatchHome;
