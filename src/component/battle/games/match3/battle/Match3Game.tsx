import { ConvexReactClient } from 'convex/react';
import PlatformConvexProvider from 'host/service/platformAuth/PlatformConvexProvider';
import React from 'react';
import GamePlayer from './GamePlayer';
import Match3GameProvider from './service/GameManager';
import './style.css';

import type {
  TriathlonMidSessionAdvanceHandler,
  TriathlonSessionReplayHandler,
} from 'component/battle/games/shared/casualTriathlonSubmitFlow';

interface Match3GameProps {
  gameId?: string;
  casualTournamentId?: string;
  casualMatchGameId?: string;
  onGameSubmit?: () => void;
  onTriathlonNextGame?: TriathlonMidSessionAdvanceHandler;
  onTriathlonSessionReplay?: TriathlonSessionReplayHandler;
}

const convexUrl =
  import.meta.env.VITE_CONVEX_URL_MATCH3 ?? 'https://strong-condor-681.convex.cloud';

const Match3GameInner: React.FC<Omit<Match3GameProps, 'className' | 'style'>> = ({
  casualTournamentId,
  casualMatchGameId,
  onGameSubmit,
  onTriathlonNextGame,
  onTriathlonSessionReplay,
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
      onTriathlonNextGame={onTriathlonNextGame}
      onTriathlonSessionReplay={onTriathlonSessionReplay}
    >
      <GamePlayer />
    </Match3GameProvider>
  );
};

const Match3Game: React.FC<Match3GameProps> = ({
  casualTournamentId,
  casualMatchGameId,
  onGameSubmit,
  onTriathlonNextGame,
  onTriathlonSessionReplay,
}) => {
  const client = React.useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <div className="match3-game-root" style={{ width: '100%', height: '100%' }}>
      <PlatformConvexProvider client={client}>
        <Match3GameInner
          casualTournamentId={casualTournamentId}
          casualMatchGameId={casualMatchGameId}
          onGameSubmit={onGameSubmit}
          onTriathlonNextGame={onTriathlonNextGame}
          onTriathlonSessionReplay={onTriathlonSessionReplay}
        />
      </PlatformConvexProvider>
    </div>
  );
};

export default Match3Game;
