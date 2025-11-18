/**
 * 单人纸牌游戏主入口组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React from 'react';
import GamePlayer from './GamePlayer';
import { EventProvider } from './service/EventProvider';
import SoloGameProvider from './service/GameManager';
import SoloDnDProvider from './service/SoloDnDProvider';
import './style.css';
import { SoloGameConfig } from './types/SoloTypes';

interface SoloGameProps {
    gameId?: string;
    config?: Partial<SoloGameConfig>;
    className?: string;
    style?: React.CSSProperties;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}
const convex_url = "https://artful-chipmunk-59.convex.cloud"
const SoloGame: React.FC<SoloGameProps> = ({
    gameId,
    config,
    className = '',
    style,
    onGameLoadComplete,
    onGameSubmit
}) => {



    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
    // 初始化游戏


    return (
        // <div className={`solo-game-container ${className}`} style={style}>
        <div className="solo-game-container" >
            {/* <SSAProvider app="solitaireArena"> */}
            <ConvexProvider client={client}>
                <SoloGameProvider config={config} gameId={gameId} onGameLoadComplete={onGameLoadComplete} onGameSubmit={onGameSubmit}>
                    <EventProvider>
                        <SoloDnDProvider>
                            <GamePlayer gameId={gameId} />
                        </SoloDnDProvider>
                    </EventProvider>
                </SoloGameProvider>
            </ConvexProvider>

        </div>
    );
};

export default SoloGame;
