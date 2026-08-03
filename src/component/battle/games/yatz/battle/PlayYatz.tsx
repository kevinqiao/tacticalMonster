import type { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import { PlayCasualGameModalShell } from 'component/battle/games/shared/PlayCasualGameModalShell';
import YatzGame from './YatzGame';

const PlayYatz: React.FC<ModalProp> = ({ visible, data, close }) => {
  const casualTournamentId =
    typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
  const casualMatchGameId =
    typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;

  return (
    <PlayCasualGameModalShell visible={visible} data={data} close={close}>
      <YatzGame
        casualTournamentId={casualTournamentId}
        casualMatchGameId={casualMatchGameId}
        onGameSubmit={close}
      />
    </PlayCasualGameModalShell>
  );
};

export default PlayYatz;
