import type { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import TowerArenaGame from './TowerArenaGame';

const PlayTowerArena: React.FC<ModalProp> = ({ visible, data, close }) => {
  if (!visible) return null;
  const casualTournamentId =
    typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
  const casualMatchGameId =
    typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;

  if (casualTournamentId && !casualMatchGameId) {
    return (
      <div className="tower-game-container" role="alert">
        <p>请先在 Play 报名日榜或锦标，再进入对局。</p>
        <button type="button" onClick={close}>
          关闭
        </button>
      </div>
    );
  }

  return (
    <TowerArenaGame
      casualTournamentId={casualTournamentId}
      casualMatchGameId={casualMatchGameId}
      onGameSubmit={close}
    />
  );
};

export default PlayTowerArena;
