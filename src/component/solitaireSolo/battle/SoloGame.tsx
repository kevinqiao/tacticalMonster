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
}
const convex_url = "https://artful-chipmunk-59.convex.cloud"
const SoloGame: React.FC<SoloGameProps> = ({
    gameId,
    config,
    className = '',
    style,
    onGameLoadComplete
}) => {

    console.log("gameId", gameId);

    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
    // 初始化游戏

    // if (!isInitialized) {
    //     return (
    //         <div className={`solo-game-loading ${className}`} style={style}>
    //             <div style={{
    //                 display: 'flex',
    //                 alignItems: 'center',
    //                 justifyContent: 'center',
    //                 height: '100%',
    //                 fontSize: '18px',
    //                 color: '#666'
    //             }}>
    //                 Loading Solo Game...
    //             </div>
    //         </div>
    //     );
    // }

    // console.log('SoloGame rendering, initialized:', isInitialized);

    return (
        <div className={`solo-game-container ${className}`} style={style}>
            {/* <SSAProvider app="solitaireArena"> */}
            <ConvexProvider client={client}>
                <SoloGameProvider config={config} gameId={gameId} onGameLoadComplete={onGameLoadComplete}>
                    <EventProvider>
                        <SoloDnDProvider>
                            <GamePlayer gameId={gameId} />
                        </SoloDnDProvider>
                    </EventProvider>
                </SoloGameProvider>
            </ConvexProvider>
            {/* </SSAProvider> */}

            {/* <div style={{ position: 'absolute', top: 150, left: 0, zIndex: 2000 }}>
                <button
                    onClick={() => setGameId("game-deal")}
                    style={{
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '8px 12px',
                        height: '36px', // 固定高度
                        minHeight: '36px',
                    }}
                >
                    Game Dealed
                </button>
            </div> */}
        </div>
    );
};

export default SoloGame;
