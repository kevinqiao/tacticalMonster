import React, { useCallback } from 'react';
import { useSoloGameManager } from './service/GameManager';
import "./style.css";
import { GameReport } from './types/SoloTypes';
interface GameReportProps {
  gameReport: GameReport;
}


export const GameOverReport = () => {
  const { gameState, gameReport, submitScore } = useSoloGameManager();

  const load = useCallback((element: HTMLDivElement | null) => {
    if (gameState)
      gameState.reportElement = element;
  }, [gameState]);

  return (
    <div ref={load} className="game-over">
      <h1>Game Over</h1>
      <p>Score: {gameReport?.totalScore}</p>
      <div className="game-over-submit-container">
        <button onClick={() => submitScore(gameReport?.totalScore ?? 0)}>Submit Score</button>
      </div>
    </div>
  );
};




export default GameOverReport;