/**
 * Block Blast 游戏主入口组件
 * 基于 solitaireSolo 的架构模式
 */

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React from 'react';
import GamePlayer from './GamePlayer';
import BlockBlastDnDProvider from './service/BlockBlastDnDProvider';
import { EventProvider } from './service/EventProvider';
import BlockBlastGameProvider from './service/GameManager';
import './style.css';
import { BlockBlastGameConfig } from './types/BlockBlastTypes';

interface BlockBlastGameProps {
    gameId?: string;
    config?: Partial<BlockBlastGameConfig>;
    className?: string;
    style?: React.CSSProperties;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

const convex_url = "https://artful-chipmunk-59.convex.cloud"; // TODO: 更新为实际的 Convex URL

const BlockBlastGame: React.FC<BlockBlastGameProps> = ({
    gameId,
    config,
    className = '',
    style,
    onGameLoadComplete,
    onGameSubmit
}) => {
    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);

    return (
        <div className={`blockblast-game-container ${className}`} style={style}>
            <ConvexProvider client={client}>
                <BlockBlastGameProvider
                    config={config}
                    gameId={gameId}
                    onGameLoadComplete={onGameLoadComplete}
                    onGameSubmit={onGameSubmit}
                >
                    <EventProvider>
                        <BlockBlastDnDProvider>
                            <GamePlayer gameId={gameId} />
                        </BlockBlastDnDProvider>
                    </EventProvider>
                </BlockBlastGameProvider>
            </ConvexProvider>
        </div>
    );
};

export default BlockBlastGame;

