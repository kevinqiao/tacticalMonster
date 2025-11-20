/**
 * Block Blast 游戏主界面组件
 * 基于 solitaireSolo 的 GamePlayer 模式
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useBlockBlastGameManager } from './service/GameManager';
import { BlockBlastGameStatus, BoardDimension } from './types/BlockBlastTypes';
import GridView from './view/GridView';
import ShapePreview from './view/ShapePreview';

const BlockBlastPlayer: React.FC<{ gameId?: string }> = ({ gameId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        gameState,
        boardDimension,
        updateBoardDimension,
        onGameOver
    } = useBlockBlastGameManager();

    // 计算棋盘尺寸
    const calculateBoardDimension = useCallback((): BoardDimension => {
        if (!containerRef.current) {
            return {
                left: 0,
                top: 0,
                width: 800,
                height: 600,
                cellSize: 40,
                spacing: 2,
                grid: {
                    x: 50,
                    y: 50,
                    width: 400,
                    height: 400,
                },
                shapePreview: {
                    x: 500,
                    y: 50,
                    width: 300,
                    height: 500,
                },
            };
        }

        const rect = containerRef.current.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        // 计算网格尺寸
        const gridSize = Math.min(containerWidth * 0.6, containerHeight * 0.8);
        const cellSize = Math.floor(gridSize / 10);
        const gridWidth = cellSize * 10;
        const gridHeight = cellSize * 10;

        // 预览区尺寸
        const previewWidth = containerWidth * 0.35;
        const previewHeight = containerHeight * 0.8;

        return {
            left: 0,
            top: 0,
            width: containerWidth,
            height: containerHeight,
            cellSize,
            spacing: 2,
            grid: {
                x: (containerWidth - gridWidth - previewWidth - 20) / 2,
                y: (containerHeight - gridHeight) / 2,
                width: gridWidth,
                height: gridHeight,
            },
            shapePreview: {
                x: (containerWidth - gridWidth - previewWidth - 20) / 2 + gridWidth + 20,
                y: (containerHeight - previewHeight) / 2,
                width: previewWidth,
                height: previewHeight,
            },
        };
    }, []);

    // 初始化棋盘尺寸
    useEffect(() => {
        if (containerRef.current) {
            const dimension = calculateBoardDimension();
            updateBoardDimension(dimension);
        }
    }, [calculateBoardDimension, updateBoardDimension]);

    // 监听窗口大小变化
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const dimension = calculateBoardDimension();
                updateBoardDimension(dimension);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [calculateBoardDimension, updateBoardDimension]);

    // 检查游戏结束
    useEffect(() => {
        if (gameState && gameState.status !== BlockBlastGameStatus.PLAYING) {
            onGameOver();
        }
    }, [gameState, onGameOver]);

    if (!gameState) {
        return (
            <div className="blockblast-loading">
                <div>Loading game...</div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="blockblast-player-container" style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <GridView />
            <ShapePreview />
            <div className="blockblast-info" style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                padding: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '8px',
                fontSize: '14px',
            }}>
                <div>Score: {gameState.score}</div>
                <div>Lines: {gameState.lines}</div>
                <div>Moves: {gameState.moves}</div>
            </div>
        </div>
    );
};

export default BlockBlastPlayer;

