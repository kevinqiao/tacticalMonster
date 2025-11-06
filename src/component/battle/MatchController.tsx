import React, { lazy, useEffect, useMemo } from "react";
import MatchProvider, { useMatchManager } from "./MatchManager";
import { GamePlayerProps, PlayerMatch } from "./MatchTypes";
import "./style.css";
const http_url = "https://beloved-mouse-699.convex.site"

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
const MatchPlayer: React.FC = (props) => {
  const { matchState, reportView } = useMatchManager();
  const GamePlayerComponent = useMemo(() => getGamePlayerComponent(matchState?.gameType ?? 'solitaireArena'), [matchState]);

  return (
    <>
      <div ref={reportView} id="match-report" className="match-report-container" >Report</div>
      <GamePlayerComponent gameId={matchState?.gameId ?? ''} gameType={matchState?.gameType ?? 'solitaireArena'} />
    </>
  );
};
const MatchController: React.FC<{ match: PlayerMatch, onGameLoadComplete: () => void }> = (props) => {
  // const [match, setMatch] = useState<PlayerMatch | null>(null);
  // const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
  useEffect(() => {
    const loadGame = async () => {
      const url = `${http_url}/findMatchGame`;
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ gameId: props.match.gameId }),
      });
      const data = await res.json();
      setTimeout(() => props.onGameLoadComplete(), 4000);
      console.log("data", data);
    };
    if (props.match?.gameId) {
      loadGame();
    }
  }, [props.match]);
  return (
    // <ConvexProvider client={client}>
    <MatchProvider match={props.match}>
      <MatchPlayer />
    </MatchProvider>
    // </ConvexProvider>
  );
};

export default MatchController;
