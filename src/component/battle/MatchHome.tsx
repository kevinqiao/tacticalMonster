import React, { lazy, useEffect, useMemo } from "react";
import { useUserManager } from "service/UserManager";
import MatchProvider, { useMatchManager } from "./MatchProvider";
import { GamePlayerProps, PlayerMatch } from "./MatchTypes";
import "./style.css";
// const http_url = "https://beloved-mouse-699.convex.site"

const GamePlayerCache = new Map<string, React.ComponentType<GamePlayerProps>>();
const gamePlayerMap: Record<string, () => Promise<any>> = {
  'solitaire': () => import('../solitaireSolo/battle/SoloGame'),
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
export const MatchPlayer: React.FC<{ onGameLoadComplete?: () => void, onScoreSubmit?: () => void }> = ({ onGameLoadComplete, onScoreSubmit }) => {
  const { matchState, reportView } = useMatchManager();
  const GamePlayerComponent = useMemo(() => getGamePlayerComponent(matchState?.gameType ?? 'solitaire'), [matchState]);
  const { updateUserData } = useUserManager();
  useEffect(() => {
    console.log("MatchPlayer matchState", matchState);
    // if (matchState?.matchId) {
    //   updateUserData({ game: { name: matchState.gameType, matchId: matchState.matchId, gameId: matchState.gameId } });
    // }

  }, [matchState])
  return (
    <>
      <div ref={reportView} id="match-report" className="match-report-container" >Report</div>
      {matchState?.gameId && <GamePlayerComponent gameId={matchState.gameId} gameType={matchState.gameType ?? 'solitaire'} onGameLoadComplete={onGameLoadComplete} onScoreSubmit={onScoreSubmit} />}
    </>
  );
};
const MatchHome: React.FC<{ match: PlayerMatch | null, onGameLoadComplete: () => void, onScoreSubmit: () => void }> = (props) => {

  console.log("MatchHome match", props.match);
  if (!props.match) {
    return null;
  }
  return (
    // <ConvexProvider client={client}>
    <MatchProvider match={props.match}>
      <MatchPlayer onGameLoadComplete={props.onGameLoadComplete} onScoreSubmit={props.onScoreSubmit} />
    </MatchProvider>
    // </ConvexProvider>
  );
};

export default MatchHome;
