import type { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import { PlayCasualGameModalShell } from 'component/battle/games/shared/PlayCasualGameModalShell';
import BlockBlastGame from './BlockBlastGame';

/**
 * 弹层内 Block Blast 入口：`RenderModal` 按路径懒加载。
 * 休闲平台须先 `joinTournament` 取得 `casualMatchGameId`；仅传模板 id 不开局（防无经济「练习」）。
 */
const PlayBlockBlast: React.FC<ModalProp> = ({ visible, data, close }) => {
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
            <BlockBlastGame
                key={sessionKey ?? 'blockblast'}
                casualTournamentId={casualTournamentId}
                casualMatchGameId={casualMatchGameId}
                onGameSubmit={close}
            />
        </PlayCasualGameModalShell>
    );
};

export default PlayBlockBlast;
