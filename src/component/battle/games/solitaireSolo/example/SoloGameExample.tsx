/**
 * 单人纸牌游戏使用示例
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import React, { useCallback, useState } from 'react';
import { SoloGame, SoloGameConfig, SoloSessionStats } from '../index';

const SoloGameExample: React.FC = () => {
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

    // 游戏配置
    const gameConfig: Partial<SoloGameConfig> = {
        scoring: {
            foundationMove: 10,
            tableauMove: 5,
            wasteMove: 0,
            timeBonus: 1,
            movePenalty: -1
        },
        hintsEnabled: true,
        autoComplete: true
    };

    // 处理游戏完成
    const handleGameComplete = useCallback((won: boolean, score: number, stats: SoloSessionStats) => {
        setGameStats(stats);
        console.log(`Game ${won ? 'won' : 'lost'}! Score: ${score}`);
    }, []);

    // 处理游戏开始
    const handleGameStart = useCallback(() => {
        console.log('Game started!');
    }, []);

    // 处理游戏暂停
    const handleGamePause = useCallback(() => {
        console.log('Game paused!');
    }, []);

    // 处理游戏恢复
    const handleGameResume = useCallback(() => {
        console.log('Game resumed!');
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* 游戏统计信息 */}
            <div style={{
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderBottom: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div>Games Played: {gameStats.gamesPlayed}</div>
                <div>Win Rate: {gameStats.winRate.toFixed(1)}%</div>
                <div>Best Score: {gameStats.bestScore}</div>
                <div>Current Streak: {gameStats.currentStreak}</div>
                <div>Longest Streak: {gameStats.longestStreak}</div>
            </div>

            {/* 游戏区域 */}
            <div style={{ flex: 1, position: 'relative' }}>
                <SoloGame
                    config={gameConfig}
                    onGameComplete={handleGameComplete}
                    onGameStart={handleGameStart}
                    onGamePause={handleGamePause}
                    onGameResume={handleGameResume}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* 游戏说明 */}
            <div style={{
                padding: '10px',
                backgroundColor: '#f9f9f9',
                borderTop: '1px solid #ddd',
                fontSize: '12px',
                color: '#666'
            }}>
                <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>How to Play:</div>
                <div>• Click and drag cards to move them</div>
                <div>• Double-click cards to auto-move to foundation</div>
                <div>• Press H for hints, Ctrl+U to undo, Ctrl+A for auto-complete</div>
                <div>• Build foundation piles in suit order (A to K)</div>
                <div>• Build tableau columns in alternating colors (K to A)</div>
            </div>
        </div>
    );
};

export default SoloGameExample;
