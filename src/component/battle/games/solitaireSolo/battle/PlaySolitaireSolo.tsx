import { ModalProp } from 'host/service/ModalManager';
import React from 'react';
import SolitaireGame from './SolitaireGame';

/**
 * 弹层内接龙入口：`RenderModal` 按路径懒加载本文件。
 * `data?.gameId` 可选；省略则由 `SoloGame` 内生成 id 并由 `loadGame` action 建局。
 */
const PlaySolitaireSolo: React.FC<ModalProp> = ({ visible, data, close }) => {
    if (!visible) return null;
    const gameId = typeof data?.gameId === 'string' ? data.gameId : undefined;
    const casualTournamentId =
        typeof data?.casualTournamentId === 'string' ? data.casualTournamentId : undefined;
    const casualMatchGameId =
        typeof data?.casualMatchGameId === 'string' ? data.casualMatchGameId : undefined;
    return (
        <SolitaireGame
            gameId={gameId}
            casualTournamentId={casualTournamentId}
            casualMatchGameId={casualMatchGameId}
            onGameSubmit={close}
        />
    );
};

export default PlaySolitaireSolo;
