/**
 * 单人纸牌游戏主入口组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useCallback, useEffect, useState } from 'react';
import SoloGameControl from './control/SoloGameControl';
import SoloDnDProvider from './service/SoloDnDProvider';
import SoloGameProvider from './service/SoloGameManager';
import SoloPlayer from './SoloPlayer';
import './style.css';
import { SoloGameConfig, SoloSessionStats } from './types/SoloTypes';

interface SoloGameProps {
    config?: Partial<SoloGameConfig>;
    onGameComplete?: (won: boolean, score: number, stats: SoloSessionStats) => void;
    onGameStart?: () => void;
    onGamePause?: () => void;
    onGameResume?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

const SoloGame: React.FC<SoloGameProps> = ({
    config,
    onGameComplete,
    onGameStart,
    onGamePause,
    onGameResume,
    className = '',
    style
}) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [gameStats, setGameStats] = useState<SoloSessionStats>({
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        bestTime: 0,
        bestScore: 0,
        averageMoves: 0,
        averageTime: 0,
        currentStreak: 0,
        longestStreak: 0
    });

    // 处理游戏完成
    const handleGameComplete = useCallback((won: boolean, score: number) => {
        setGameStats(prevStats => {
            const newStats = {
                ...prevStats,
                gamesPlayed: prevStats.gamesPlayed + 1,
                gamesWon: prevStats.gamesWon + (won ? 1 : 0),
                winRate: ((prevStats.gamesWon + (won ? 1 : 0)) / (prevStats.gamesPlayed + 1)) * 100,
                bestScore: Math.max(prevStats.bestScore, score),
                currentStreak: won ? prevStats.currentStreak + 1 : 0,
                longestStreak: Math.max(prevStats.longestStreak, won ? prevStats.currentStreak + 1 : 0)
            };

            onGameComplete?.(won, score, newStats);
            return newStats;
        });
    }, [onGameComplete]);

    // 处理游戏开始
    const handleGameStart = useCallback(() => {
        onGameStart?.();
    }, [onGameStart]);

    // 处理游戏暂停
    const handleGamePause = useCallback(() => {
        onGamePause?.();
    }, [onGamePause]);

    // 处理游戏恢复
    const handleGameResume = useCallback(() => {
        onGameResume?.();
    }, [onGameResume]);

    // 处理提示请求
    const handleHintRequest = useCallback((hints: any[]) => {
        console.log('Game hints:', hints);
        // 这里可以显示提示UI
    }, []);

    // 处理移动完成
    const handleMoveComplete = useCallback((move: any) => {
        console.log('Move completed:', move);
        // 这里可以更新UI或播放音效
    }, []);

    // 初始化游戏
    useEffect(() => {
        setIsInitialized(true);
    }, []);

    if (!isInitialized) {
        return (
            <div className={`solo-game-loading ${className}`} style={style}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    fontSize: '18px',
                    color: '#666'
                }}>
                    Loading Solo Game...
                </div>
            </div>
        );
    }

    return (
        <div className={`solo-game-container ${className}`} style={style}>
            <SoloGameProvider config={config}>
                <SoloDnDProvider>
                    <SoloPlayer
                        onGameComplete={handleGameComplete}
                        onGameStart={handleGameStart}
                        onGamePause={handleGamePause}
                        onGameResume={handleGameResume}
                    />
                    <SoloGameControl
                        onGameComplete={handleGameComplete}
                        onMoveComplete={handleMoveComplete}
                        onHintRequest={handleHintRequest}
                    />
                </SoloDnDProvider>
            </SoloGameProvider>
        </div>
    );
};

export default SoloGame;
