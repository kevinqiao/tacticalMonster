import { ConvexReactClient } from 'convex/react';
import PlatformConvexProvider from 'host/service/platformAuth/PlatformConvexProvider';
import React from 'react';
import GamePlayer from './GamePlayer';
import YatzGameProvider from './service/GameManager';
import './style.css';

interface YatzGameProps {
  casualTournamentId?: string;
  casualMatchGameId?: string;
  onGameSubmit?: () => void;
}

const convexUrl =
  import.meta.env.VITE_CONVEX_URL_YATZ ?? 'https://precious-retriever-7.convex.cloud';

const YatzGame: React.FC<YatzGameProps> = ({
  casualTournamentId,
  casualMatchGameId,
  onGameSubmit,
}) => {
  const client = React.useMemo(() => new ConvexReactClient(convexUrl), []);
  if (!casualMatchGameId) {
    return <div className="yatz-game-root">Missing game id</div>;
  }
  return (
    <div className="yatz-game-root" style={{ width: '100%', height: '100%' }}>
      <PlatformConvexProvider client={client}>
        <YatzGameProvider
          gameId={casualMatchGameId}
          casualTournamentId={casualTournamentId}
          onGameSubmit={onGameSubmit}
        >
          <GamePlayer />
        </YatzGameProvider>
      </PlatformConvexProvider>
    </div>
  );
};

export default YatzGame;
