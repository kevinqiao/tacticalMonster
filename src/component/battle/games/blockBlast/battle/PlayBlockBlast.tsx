import type { ModalProp } from '@/service/ModalManager';
import React from 'react';
import BlockBlastGame from './BlockBlastGame';

/**
 * 弹层内 Block Blast 入口：`RenderModal` 按路径懒加载。
 * `data?.gameId` 可选；省略则由 `BlockBlastGame` 内 `createBlockBlastGame` 建局。
 */
const PlayBlockBlast: React.FC<ModalProp> = ({ visible, data, close }) => {
    if (!visible) return null;
    const gameId = typeof data?.gameId === 'string' ? data.gameId : undefined;
    return <BlockBlastGame gameId={gameId} onGameSubmit={close} />;
};

export default PlayBlockBlast;
