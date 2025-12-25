/**
 * 重播控制组件
 */
import React from 'react';
import { useCombatManager } from '../service/CombatManager';

export const ReplayControls: React.FC = () => {
    const { replay, mode } = useCombatManager();

    if (mode !== 'replay' || !replay) {
        return null;
    }

    const { state, play, pause, stop, seekTo, setSpeed } = replay;

    // 格式化时间
    const formatTime = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    // 计算进度百分比
    const progress = state.totalTime > 0
        ? (state.currentTime / state.totalTime) * 100
        : 0;

    return (
        <div className="replay-controls" style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '15px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            zIndex: 1000,
            minWidth: '600px',
        }}>
            {/* 播放/暂停按钮 */}
            <button
                onClick={state.isPlaying ? pause : play}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '5px 10px',
                }}
                title={state.isPlaying ? '暂停' : '播放'}
            >
                {state.isPlaying ? '⏸' : '▶'}
            </button>

            {/* 停止按钮 */}
            <button
                onClick={stop}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '5px 10px',
                }}
                title="停止"
            >
                ⏹
            </button>

            {/* 进度条 */}
            <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                    type="range"
                    min={0}
                    max={state.totalTime}
                    value={state.currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'white',
                    marginTop: '5px',
                }}>
                    <span>{formatTime(state.currentTime)}</span>
                    <span>{formatTime(state.totalTime)}</span>
                </div>
            </div>

            {/* 速度控制 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button
                    onClick={() => setSpeed(0.5)}
                    style={{
                        background: state.playbackSpeed === 0.5 ? '#4CAF50' : 'transparent',
                        border: '1px solid white',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                    title="0.5x 速度"
                >
                    0.5x
                </button>
                <button
                    onClick={() => setSpeed(1.0)}
                    style={{
                        background: state.playbackSpeed === 1.0 ? '#4CAF50' : 'transparent',
                        border: '1px solid white',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                    title="1x 速度"
                >
                    1x
                </button>
                <button
                    onClick={() => setSpeed(2.0)}
                    style={{
                        background: state.playbackSpeed === 2.0 ? '#4CAF50' : 'transparent',
                        border: '1px solid white',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                    title="2x 速度"
                >
                    2x
                </button>
            </div>

            {/* 进度信息 */}
            <div style={{
                fontSize: '12px',
                color: 'white',
                minWidth: '80px',
                textAlign: 'right',
            }}>
                {state.currentIndex} / {state.totalEvents}
            </div>
        </div>
    );
};

