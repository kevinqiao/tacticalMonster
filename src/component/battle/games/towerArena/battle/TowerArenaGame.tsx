import { ConvexReactClient } from 'convex/react';
import PlatformConvexProvider from 'host/service/platformAuth/PlatformConvexProvider';
import React from 'react';
import GamePlayer from './GamePlayer';
import TowerGameProvider from './service/GameManager';
import './style.css';

interface TowerArenaGameProps {
  casualTournamentId?: string;
  casualMatchGameId?: string;
  onGameSubmit?: () => void;
}

const convexUrl =
  import.meta.env.VITE_CONVEX_URL_TOWER ?? 'https://tower-arena-dev.convex.cloud';

const TowerArenaGameInner: React.FC<TowerArenaGameProps> = ({
  casualTournamentId,
  casualMatchGameId,
  onGameSubmit,
}) => {
  const gameId = casualMatchGameId;
  if (!gameId) {
    return <div className="tower-game-container">缺少对局 ID</div>;
  }

  return (
    <TowerGameProvider
      gameId={gameId}
      casualTournamentId={casualTournamentId}
      onGameSubmit={onGameSubmit}
    >
      <GamePlayer />
    </TowerGameProvider>
  );
};

const TowerArenaGame: React.FC<TowerArenaGameProps> = (props) => {
  const client = React.useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <div className="tower-game-container">
      <PlatformConvexProvider client={client}>
        <TowerArenaGameInner {...props} />
      </PlatformConvexProvider>
    </div>
  );
};

export default TowerArenaGame;
