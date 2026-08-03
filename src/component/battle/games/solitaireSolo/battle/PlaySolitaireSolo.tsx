import { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import { PlayCasualGameModalShell } from 'component/battle/games/shared/PlayCasualGameModalShell';
import SolitaireGame from './SolitaireGame';

/**
 * 弹层内接龙入口：`RenderModal` 按路径懒加载本文件。
 * 休闲平台须先 `joinTournament` 取得 `casualMatchGameId`；仅传模板 id 不开局（防无经济「练习」）。
 */
const PlaySolitaireSolo: React.FC<ModalProp> = ({ visible, data, close }) => {
    const casualTournamentId =
        typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
    const casualMatchGameId =
        typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;
    const sessionKey =
        typeof data?.casualSessionKey === 'string'
            ? data.casualSessionKey
            : casualMatchGameId;

    return (
        <PlayCasualGameModalShell visible={visible} data={data} close={close}>
            <SolitaireGame
                key={sessionKey ?? 'solitaire'}
                casualTournamentId={casualTournamentId}
                casualMatchGameId={casualMatchGameId}
                onGameSubmit={close}
            />
        </PlayCasualGameModalShell>
    );
};

export default PlaySolitaireSolo;
