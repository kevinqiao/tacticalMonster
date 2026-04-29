import React, { useCallback } from 'react';
import './style.css';
import { useBlockBlastGameManager } from './service/GameManager';
import { BlockBlastGameStatus } from './types/BlockBlastTypes';

export const GameOverReport: React.FC = () => {
    const { gameState, gameReport, submitScore } = useBlockBlastGameManager();

    const load = useCallback(
        (element: HTMLDivElement | null) => {
            if (gameState) gameState.reportElement = element;
        },
        [gameState]
    );

    const show = gameState && gameState.status !== BlockBlastGameStatus.PLAYING;
    if (!show) return null;

    return (
        <div ref={load} className="blockblast-game-over">
            <h1>Game Over</h1>
            <p>Score: {gameReport?.totalScore ?? '…'}</p>
            <div className="blockblast-game-over-submit-container">
                <div
                    className="blockblast-game-over-submit-btn"
                    onClick={() => submitScore(gameReport?.totalScore ?? 0)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            submitScore(gameReport?.totalScore ?? 0);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                >
                    Submit Score
                </div>
            </div>
        </div>
    );
};

export default GameOverReport;
