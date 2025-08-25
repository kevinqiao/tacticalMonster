/**
 * 游戏流程使用示例
 * 展示如何调用完整的游戏流程接口
 */

import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '../../../../../_generated/api';

interface GameFlowExampleProps {
    uid: string;
}

export function GameFlowExample({ uid }: GameFlowExampleProps) {
    const [selectedSeed, setSelectedSeed] = useState<string>('');
    const [gameScore, setGameScore] = useState<number>(0);
    const [gameData, setGameData] = useState({
        completionTime: 0,
        retryCount: 0,
        difficulty: 'just_right' as const,
        enjoyment: 0.5
    });

    // 1. 获取推荐种子
    const recommendedSeeds = useQuery(api.gameFlowController.getRecommendedSeeds, {
        uid,
        options: {
            limit: 3,
            preferredDifficulty: 'balanced'
        }
    });

    // 2. 获取玩家技能等级
    const playerSkillLevel = useQuery(api.gameFlowController.getPlayerSkillLevel, { uid });

    // 3. 获取玩家游戏历史
    const gameHistory = useQuery(api.gameFlowController.getPlayerGameHistory, { uid, limit: 10 });

    // 4. 提交游戏分数
    const submitScore = useMutation(api.gameFlowController.submitGameScore);

    // 5. 获取种子难度统计
    const seedStats = useQuery(api.gameFlowController.getSeedDifficultyStats, {
        seedId: selectedSeed
    });

    // 处理游戏开始
    const handleGameStart = (seedId: string) => {
        setSelectedSeed(seedId);
        setGameScore(0);
        setGameData({
            completionTime: 0,
            retryCount: 0,
            difficulty: 'just_right',
            enjoyment: 0.5
        });
    };

    // 处理游戏结束
    const handleGameEnd = async () => {
        if (!selectedSeed || gameScore === 0) {
            alert('请选择种子并输入分数');
            return;
        }

        try {
            const matchId = `match_${Date.now()}`;
            const result = await submitScore({
                uid,
                seedId: selectedSeed,
                matchId,
                score: gameScore,
                gameData
            });

            if (result.success) {
                alert(`游戏结束！\n排名: ${result.playerRank}\n积分: ${result.points}`);

                // 重置状态
                setSelectedSeed('');
                setGameScore(0);
            } else {
                alert('提交分数失败');
            }
        } catch (error) {
            console.error('提交分数失败:', error);
            alert('提交分数失败');
        }
    };

    // 处理用户反馈
    const handleFeedbackChange = (field: string, value: any) => {
        setGameData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (!recommendedSeeds || !playerSkillLevel || !gameHistory) {
        return <div>加载中...</div>;
    }

    return (
        <div className="game-flow-example">
            <h2>游戏流程示例</h2>

            {/* 玩家信息 */}
            <div className="player-info">
                <h3>玩家信息</h3>
                <p>技能等级: {playerSkillLevel.skillLevel}</p>
                <p>推荐难度: {recommendedSeeds.difficulty}</p>
            </div>

            {/* 推荐种子 */}
            <div className="recommended-seeds">
                <h3>推荐种子</h3>
                <p>推荐理由: {recommendedSeeds.reasoning}</p>
                <div className="seeds-grid">
                    {recommendedSeeds.recommendedSeeds?.map((seed, index) => (
                        <div
                            key={seed}
                            className={`seed-card ${selectedSeed === seed ? 'selected' : ''}`}
                            onClick={() => handleGameStart(seed)}
                        >
                            <h4>种子 {seed}</h4>
                            <p>难度: {seedStats?.difficulty || '未知'}</p>
                            <p>平均分: {seedStats?.averageScore || '未知'}</p>
                            <button
                                className="start-game-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleGameStart(seed);
                                }}
                            >
                                开始游戏
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 游戏进行中 */}
            {selectedSeed && (
                <div className="game-in-progress">
                    <h3>游戏进行中</h3>
                    <p>当前种子: {selectedSeed}</p>

                    <div className="score-input">
                        <label>游戏分数:</label>
                        <input
                            type="number"
                            value={gameScore}
                            onChange={(e) => setGameScore(Number(e.target.value))}
                            placeholder="输入你的分数"
                        />
                    </div>

                    <div className="game-data">
                        <h4>游戏数据</h4>

                        <div className="form-group">
                            <label>完成时间 (秒):</label>
                            <input
                                type="number"
                                value={gameData.completionTime}
                                onChange={(e) => handleFeedbackChange('completionTime', Number(e.target.value))}
                            />
                        </div>

                        <div className="form-group">
                            <label>重试次数:</label>
                            <input
                                type="number"
                                value={gameData.retryCount}
                                onChange={(e) => handleFeedbackChange('retryCount', Number(e.target.value))}
                            />
                        </div>

                        <div className="form-group">
                            <label>难度感受:</label>
                            <select
                                value={gameData.difficulty}
                                onChange={(e) => handleFeedbackChange('difficulty', e.target.value)}
                            >
                                <option value="too_easy">太简单</option>
                                <option value="just_right">刚刚好</option>
                                <option value="too_hard">太难了</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>游戏体验 (0-1):</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={gameData.enjoyment}
                                onChange={(e) => handleFeedbackChange('enjoyment', Number(e.target.value))}
                            />
                            <span>{gameData.enjoyment}</span>
                        </div>
                    </div>

                    <button
                        className="end-game-btn"
                        onClick={handleGameEnd}
                        disabled={gameScore === 0}
                    >
                        结束游戏
                    </button>
                </div>
            )}

            {/* 游戏历史 */}
            <div className="game-history">
                <h3>游戏历史</h3>
                <div className="history-list">
                    {gameHistory.matches?.map((match, index) => (
                        <div key={index} className="history-item">
                            <span>种子: {match.seedId}</span>
                            <span>分数: {match.score}</span>
                            <span>排名: {match.rank}</span>
                            <span>积分: {match.points}</span>
                            <span>时间: {new Date(match.createdAt).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 样式文件 (可以单独创建)
const styles = `
.game-flow-example {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.player-info {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.recommended-seeds {
    margin-bottom: 20px;
}

.seeds-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.seed-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.3s;
}

.seed-card:hover {
    border-color: #007bff;
}

.seed-card.selected {
    border-color: #28a745;
    background-color: #f8fff9;
}

.start-game-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
}

.game-in-progress {
    background: #e8f5e8;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.score-input {
    margin-bottom: 20px;
}

.score-input input {
    width: 200px;
    padding: 8px;
    margin-left: 10px;
}

.game-data {
    margin-bottom: 20px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: inline-block;
    width: 120px;
    margin-right: 10px;
}

.form-group input,
.form-group select {
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.end-game-btn {
    background: #dc3545;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
}

.end-game-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
}

.game-history {
    margin-top: 30px;
}

.history-list {
    max-height: 300px;
    overflow-y: auto;
}

.history-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid #eee;
    background: #f9f9f9;
}

.history-item span {
    flex: 1;
    text-align: center;
}
`;
