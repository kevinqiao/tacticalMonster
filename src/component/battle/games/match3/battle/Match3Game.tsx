import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React from 'react';
import GamePlayer from './GamePlayer';
import Match3GameProvider from './service/GameManager';
import './style.css';

interface Match3GameProps {
  gameId?: string;
  casualTournamentId?: string;
  casualMatchGameId?: string;
  onGameSubmit?: () => void;
}

const convexUrl =
  import.meta.env.VITE_CONVEX_URL_MATCH3 ?? 'https://strong-condor-681.convex.cloud';

const Match3GameInner: React.FC<Omit<Match3GameProps, 'className' | 'style'>> = ({
  casualTournamentId,
  casualMatchGameId,
  onGameSubmit,
}) => {
  const activeGameId = casualMatchGameId;
  if (!activeGameId) {
    return <div className="match3-game-container">Missing game id</div>;
  }
  return (
    <Match3GameProvider
      gameId={activeGameId}
      casualTournamentId={casualTournamentId}
      onGameSubmit={onGameSubmit}
    >
      <GamePlayer />
    </Match3GameProvider>
  );
};

const Match3Game: React.FC<Match3GameProps> = ({
  casualTournamentId,
  casualMatchGameId,
  onGameSubmit,
}) => {
  const client = React.useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <ConvexProvider client={client}>
      <Match3GameInner
        casualTournamentId={casualTournamentId}
        casualMatchGameId={casualMatchGameId}
        onGameSubmit={onGameSubmit}
      />
    </ConvexProvider>
  );
};

export default Match3Game;
