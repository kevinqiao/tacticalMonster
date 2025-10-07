/**
 * 单人纸牌游戏主入口组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useEffect, useState } from 'react';
import GamePlayer from './GamePlayer';
import { EventProvider } from './service/EventProvider';
import SoloGameProvider from './service/GameManager';
import SoloDnDProvider from './service/SoloDnDProvider';
import './style.css';
import { SoloGameConfig } from './types/SoloTypes';

interface SoloGameProps {
    config?: Partial<SoloGameConfig>;
    className?: string;
    style?: React.CSSProperties;
}

const SoloGame: React.FC<SoloGameProps> = ({
    config,
    className = '',
    style
}) => {

    const [gameId, setGameId] = useState<string | undefined>(undefined);
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

            <SoloGameProvider config={config} gameId={gameId}>
                <EventProvider>
                    <SoloDnDProvider>
                        <GamePlayer />
                    </SoloDnDProvider>
                </EventProvider>
            </SoloGameProvider>
            <div style={{ position: 'absolute', top: 50, left: 0 }}>
                <button
                    onClick={() => setGameId("####")}
                    style={{
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '8px 12px',
                        height: '36px', // 固定高度
                        minHeight: '36px',
                    }}
                >
                    Shuffle
                </button>
            </div>
            <div style={{ position: 'absolute', top: 100, left: 0, zIndex: 2000 }}>
                <button
                    onClick={() => setGameId("game-open")}
                    style={{
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '8px 12px',
                        height: '36px', // 固定高度
                        minHeight: '36px',
                    }}
                >
                    Game Open
                </button>
            </div>
            <div style={{ position: 'absolute', top: 150, left: 0, zIndex: 2000 }}>
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
            </div>
        </div>
    );
};

export default SoloGame;
