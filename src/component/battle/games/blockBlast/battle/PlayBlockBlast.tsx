import type { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import BlockBlastGame from './BlockBlastGame';

/**
 * 弹层内 Block Blast 入口：`RenderModal` 按路径懒加载。
 * 对局 id 来自 `data.casualMatchGameId`（休闲锦标）；均未传时由 `BlockBlastGame` 内 `createBlockBlastGame` 建局。
 */
const PlayBlockBlast: React.FC<ModalProp> = ({ visible, data, close }) => {
    if (!visible) return null;
    const casualTournamentId =
        typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
    const casualMatchGameId =
        typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;
    return (
        <BlockBlastGame
            casualTournamentId={casualTournamentId}
            casualMatchGameId={casualMatchGameId}
            onGameSubmit={close}
        />
    );
};

export default PlayBlockBlast;
