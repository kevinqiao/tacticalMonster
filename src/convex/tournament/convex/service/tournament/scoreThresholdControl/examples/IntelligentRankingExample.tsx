import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '../../../../../_generated/api';

interface AIOpponent {
    uid: string;
    score: number;
    rank: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface RankingResult {
    uid: string;
    score: number;
    rank: number;
    isAI: boolean;
}

export function IntelligentRankingExample({ uid }: { uid: string }) {
    const [selectedSeed, setSelectedSeed] = useState<string>('');
    const [playerScore, setPlayerScore] = useState<number>(0);
    const [matchId, setMatchId] = useState<string>('');
    const [gameData, setGameData] = useState({
        difficulty: 'just_right' as 'too_easy' | 'just_right' | 'too_hard',
        enjoyment: 0.5,
        completionTime: 0,
        retryCount: 0
    });

    // 获取推荐种子
    const recommendedSeeds = useQuery(api.gameFlowController.getRecommendedSeeds, {
        uid,
        options: { limit: 3, preferredDifficulty: 'balanced' }
    });

    // 提交游戏分数
    const submitScore = useMutation(api.gameFlowController.submitGameScore);

    // 获取玩家技能等级
    const playerSkillLevel = useQuery(api.gameFlowController.getPlayerSkillLevel, { uid });

    const handleGameStart = (seedId: string) => {
        setSelectedSeed(seedId);
        setMatchId(`match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        setPlayerScore(0);
    };

    const handleGameEnd = async () => {
        if (!selectedSeed || !matchId || playerScore <= 0) {
            alert('请先开始游戏并输入分数');
            return;
        }

        try {
            const result = await submitScore({
                uid,
                seedId: selectedSeed,
                matchId,
                score: playerScore,
                gameData
            });

            if (result.success) {
                console.log('游戏结果:', result);
                alert(`游戏完成！\n你的排名: 第${result.playerRank}名\n获得积分: ${result.points}分`);
            } else {
                alert(`提交失败: ${result.error}`);
            }
        } catch (error) {
            console.error('提交分数失败:', error);
            alert('提交分数失败');
        }
    };

    const handleFeedbackChange = (field: string, value: any) => {
        setGameData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="intelligent-ranking-example">
            <h2>智能排名系统演示</h2>

            {/* 玩家技能等级 */}
            <div className="player-info">
                <h3>玩家信息</h3>
                <p>技能等级: {playerSkillLevel?.playerSkillLevel || '加载中...'}</p>
            </div>

            {/* 推荐种子 */}
            <div className="seed-selection">
                <h3>选择游戏种子</h3>
                {recommendedSeeds?.success && recommendedSeeds.recommendedSeeds ? (
                    <div className="seed-list">
                        {recommendedSeeds.recommendedSeeds.map((seed, index) => (
                            <button
                                key={seed}
                                onClick={() => handleGameStart(seed)}
                                className={`seed-button ${selectedSeed === seed ? 'selected' : ''}`}
                            >
                                种子 {index + 1}: {seed}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p>加载推荐种子中...</p>
                )}
            </div>

            {/* 游戏进行 */}
            {selectedSeed && (
                <div className="game-session">
                    <h3>游戏进行中</h3>
                    <p>种子: {selectedSeed}</p>
                    <p>比赛ID: {matchId}</p>

                    <div className="score-input">
                        <label>你的分数:</label>
                        <input
                            type="number"
                            value={playerScore}
                            onChange={(e) => setPlayerScore(Number(e.target.value))}
                            placeholder="输入你的游戏分数"
                            min="0"
                        />
                    </div>

                    <div className="ai-info">
                        <p><strong>AI对手信息:</strong></p>
                        <small>AI数量和难度在创建比赛时已确定，系统会根据你的技能等级自动调整</small>
                    </div>

                    {/* 游戏反馈 */}
                    <div className="game-feedback">
                        <h4>游戏体验反馈</h4>

                        <div className="feedback-item">
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

                        <div className="feedback-item">
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

                        <div className="feedback-item">
                            <label>完成时间 (秒):</label>
                            <input
                                type="number"
                                value={gameData.completionTime}
                                onChange={(e) => handleFeedbackChange('completionTime', Number(e.target.value))}
                                min="0"
                            />
                        </div>

                        <div className="feedback-item">
                            <label>重试次数:</label>
                            <input
                                type="number"
                                value={gameData.retryCount}
                                onChange={(e) => handleFeedbackChange('retryCount', Number(e.target.value))}
                                min="0"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleGameEnd}
                        disabled={playerScore <= 0}
                        className="submit-button"
                    >
                        提交游戏结果
                    </button>
                </div>
            )}

            {/* 系统说明 */}
            <div className="system-info">
                <h3>系统特性说明</h3>
                <ul>
                    <li><strong>智能AI对手:</strong> 根据玩家技能水平自动生成合适难度的AI对手</li>
                    <li><strong>阶梯式难度:</strong> AI分数呈阶梯分布，确保游戏有挑战性</li>
                    <li><strong>智能排名:</strong> 考虑玩家段位、学习率等因素计算排名</li>
                    <li><strong>完整反馈:</strong> 收集游戏体验数据，持续优化推荐</li>
                </ul>
            </div>

            <style jsx>{`
                .intelligent-ranking-example {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                }

                .player-info, .seed-selection, .game-session, .system-info {
                    margin-bottom: 30px;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }

                .seed-list {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .seed-button {
                    padding: 10px 15px;
                    border: 1px solid #007bff;
                    background: white;
                    color: #007bff;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .seed-button:hover {
                    background: #007bff;
                    color: white;
                }

                .seed-button.selected {
                    background: #007bff;
                    color: white;
                }

                .score-input, .feedback-item, .ai-info {
                    margin: 15px 0;
                }

                .score-input label, .feedback-item label {
                    display: inline-block;
                    width: 120px;
                    margin-right: 10px;
                }

                .score-input input, .feedback-item input, .feedback-item select {
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    width: 200px;
                }

                .submit-button {
                    padding: 12px 24px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }

                .submit-button:disabled {
                    background: #6c757d;
                    cursor: not-allowed;
                }

                .submit-button:hover:not(:disabled) {
                    background: #218838;
                }

                .system-info ul {
                    padding-left: 20px;
                }

                .system-info li {
                    margin: 8px 0;
                    line-height: 1.5;
                }

                .ai-info small {
                    display: block;
                    margin-top: 5px;
                    color: #666;
                    font-size: 12px;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
}
