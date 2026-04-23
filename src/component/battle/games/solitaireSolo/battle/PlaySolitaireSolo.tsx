import { ModalProp } from '@/service/ModalManager';
import React from 'react';
import SoloGame from './SoloGame';

/**
 * 弹层内接龙入口：`RenderModal` 按路径懒加载本文件。
 * `data?.gameId` 可选；省略则由 `SoloGame` 内 `createSoloGame` 建局。
 */
const PlaySolitaireSolo: React.FC<ModalProp> = ({ visible, data, close }) => {
    if (!visible) return null;
    const gameId = typeof data?.gameId === 'string' ? data.gameId : undefined;
    return (
        <SoloGame
            gameId={gameId}
            onGameSubmit={close}
        />
    );
};

export default PlaySolitaireSolo;
