/**
 * 重播计分显示组件
 */
import React from 'react';
import { useScoreCalculation } from '../hooks/useScoreCalculation';
import { getAllScoringConfigVersions } from '../../../../../../convex/tacticalMonster/convex/data/scoringConfigs';

interface ReplayScoreDisplayProps {
    gameId: string;
    game: any;
    events: any[];
    currentEventIndex: number;
}

export function ReplayScoreDisplay({ 
    gameId, 
    game, 
    events, 
    currentEventIndex 
}: ReplayScoreDisplayProps) {
    const { 
        eventScores, 
        cumulativeScores, 
        currentConfigVersion,
        setCurrentConfigVersion 
    } = useScoreCalculation(gameId, game, events, 'replay');
    
    const currentEvent = events[currentEventIndex];
    const currentEventScore = currentEvent 
        ? eventScores.get(currentEvent._id || currentEvent.time.toString()) || 0
        : 0;
    const currentCumulativeScore = currentEvent
        ? cumulativeScores.get(currentEvent._id || currentEvent.time.toString()) || 0
        : 0;
    
    const availableVersions = getAllScoringConfigVersions();
    
    return (
        <div className="replay-score-display" style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            minWidth: '200px',
            zIndex: 1000
        }}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>计分信息</div>
            
            <div style={{ marginBottom: '8px' }}>
                <div>当前事件得分: <span style={{ color: '#4CAF50' }}>{currentEventScore}</span></div>
                <div>累积得分: <span style={{ color: '#2196F3' }}>{currentCumulativeScore}</span></div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                    配置版本:
                </label>
                <select 
                    value={currentConfigVersion} 
                    onChange={(e) => setCurrentConfigVersion(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '5px',
                        borderRadius: '4px',
                        background: '#333',
                        color: 'white',
                        border: '1px solid #555'
                    }}
                >
                    {availableVersions.map(version => (
                        <option key={version.version} value={version.version}>
                            {version.version} - {version.description || ''}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

