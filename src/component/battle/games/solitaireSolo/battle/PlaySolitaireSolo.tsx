import { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import SolitaireGame from './SolitaireGame';

/**
 * 弹层内接龙入口：`RenderModal` 按路径懒加载本文件。
 * 对局 id 来自 `data.casualMatchGameId`（休闲锦标）；均未传时由 `SolitaireGame` 内生成 UUID 并由 `loadGame` action 建局。
 */
const PlaySolitaireSolo: React.FC<ModalProp> = ({ visible, data, close }) => {
    if (!visible) return null;

    const casualTournamentId =
        typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
    const casualMatchGameId =
        typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;
    return (
        <SolitaireGame
            casualTournamentId={casualTournamentId}
            casualMatchGameId={casualMatchGameId}
            onGameSubmit={close}
        />
    );
};

export default PlaySolitaireSolo;
