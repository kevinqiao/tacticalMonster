import React, { lazy, useMemo } from "react";
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
const MatchPlayer: React.FC<{ onGameLoadComplete?: () => void }> = ({ onGameLoadComplete }) => {
  const { matchState, reportView } = useMatchManager();
  const GamePlayerComponent = useMemo(() => getGamePlayerComponent(matchState?.gameType ?? 'solitaire'), [matchState]);

  return (
    <>
      <div ref={reportView} id="match-report" className="match-report-container" >Report</div>
      <GamePlayerComponent gameId={matchState?.gameId ?? ''} gameType={matchState?.gameType ?? 'solitaire'} onGameLoadComplete={onGameLoadComplete} />
    </>
  );
};
const MatchHome: React.FC<{ match: PlayerMatch, onGameLoadComplete: () => void }> = (props) => {


  return (
    // <ConvexProvider client={client}>
    <MatchProvider match={props.match}>
      <MatchPlayer onGameLoadComplete={props.onGameLoadComplete} />
    </MatchProvider>
    // </ConvexProvider>
  );
};

export default MatchHome;
