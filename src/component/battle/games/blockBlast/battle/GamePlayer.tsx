/**
 * Block Blast 主界面（对齐 solitaireSolo：测量 board、结束战报、layout effect 触发 onGameOver）
 */
import React, { useCallback, useLayoutEffect, useRef } from 'react';
import GameOverReport from './GameOverReport';
import { useBlockBlastGameManager } from './service/GameManager';
import { BlockBlastGameStatus, BoardDimension } from './types/BlockBlastTypes';
import GridView from './view/GridView';
import ShapePreview from './view/ShapePreview';

const GRID_PADDING = 10;
/** Gap between grid column and preview column (landscape), or grid row and preview row (portrait). */
const SECTION_GAP = 24;
/** 竖屏时上方为分数等预留，避免与网格重叠 */
const PORTRAIT_TOP_RESERVE = 52;

const BlockBlastPlayer: React.FC<{ gameId?: string }> = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        gameState,
        updateBoardDimension,
        onGameOver,
    } = useBlockBlastGameManager();

    const calculateBoardDimension = useCallback((): BoardDimension | null => {
        if (!containerRef.current) {
            return {
                left: 0,
                top: 0,
                width: 800,
                height: 600,
                cellSize: 40,
                spacing: 2,
                gridPadding: GRID_PADDING,
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
        const isPortrait = containerHeight >= containerWidth;
        const spacing = 2;

        if (isPortrait) {
            const hPad = 16;
            const maxBlockW = containerWidth - hPad * 2;
            const availableHForGrid = containerHeight * 0.5 - PORTRAIT_TOP_RESERVE;
            const maxBlockH = Math.max(120, availableHForGrid - SECTION_GAP * 0.5);
            const cellFromW = (maxBlockW - 2 * GRID_PADDING - 9 * spacing) / 10;
            const cellFromH = (maxBlockH - 2 * GRID_PADDING - 9 * spacing) / 10;
            const cellSize = Math.max(18, Math.min(44, Math.floor(Math.min(cellFromW, cellFromH))));
            const gridWidth = cellSize * 10 + 9 * spacing;
            const gridHeight = cellSize * 10 + 9 * spacing;
            const gridBoxW = gridWidth + GRID_PADDING * 2;
            const gridBoxH = gridHeight + GRID_PADDING * 2;
            const gridX = (containerWidth - gridBoxW) / 2;
            const gridY = PORTRAIT_TOP_RESERVE;

            const previewY = gridY + gridBoxH + SECTION_GAP;
            const previewHeight = Math.max(120, containerHeight - previewY - 12);
            const previewWidth = Math.min(containerWidth - hPad * 2, containerWidth * 0.96);
            const previewX = (containerWidth - previewWidth) / 2;

            return {
                left: rect.left,
                top: rect.top,
                width: containerWidth,
                height: containerHeight,
                cellSize,
                spacing,
                gridPadding: GRID_PADDING,
                grid: {
                    x: gridX,
                    y: gridY,
                    width: gridBoxW,
                    height: gridBoxH,
                },
                shapePreview: {
                    x: previewX,
                    y: previewY,
                    width: previewWidth,
                    height: previewHeight,
                },
            };
        }

        const gridSize = Math.min(containerWidth * 0.58, containerHeight * 0.82);
        const cellSize = Math.max(20, Math.floor(gridSize / 10));
        const gridWidth = cellSize * 10 + 9 * spacing;
        const gridHeight = cellSize * 10 + 9 * spacing;
        const gridBoxW = gridWidth + GRID_PADDING * 2;
        const gridBoxH = gridHeight + GRID_PADDING * 2;

        const previewWidth = containerWidth * 0.34;
        const previewHeight = containerHeight * 0.82;

        const gridX = (containerWidth - gridBoxW - previewWidth - SECTION_GAP) / 2;
        const gridY = (containerHeight - gridBoxH) / 2;

        return {
            left: rect.left,
            top: rect.top,
            width: containerWidth,
            height: containerHeight,
            cellSize,
            spacing,
            gridPadding: GRID_PADDING,
            grid: {
                x: gridX,
                y: gridY,
                width: gridBoxW,
                height: gridBoxH,
            },
            shapePreview: {
                x: gridX + gridBoxW + SECTION_GAP,
                y: (containerHeight - previewHeight) / 2,
                width: previewWidth,
                height: previewHeight,
            },
        };
    }, []);

    useLayoutEffect(() => {
        const run = () => {
            const d = calculateBoardDimension();
            if (d) updateBoardDimension(d);
        };
        run();
        const ro =
            typeof ResizeObserver !== 'undefined' && containerRef.current
                ? new ResizeObserver(() => run())
                : null;
        if (ro && containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', run);
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        const onVv = () => run();
        vv?.addEventListener('resize', onVv);
        vv?.addEventListener('scroll', onVv);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', run);
            vv?.removeEventListener('resize', onVv);
            vv?.removeEventListener('scroll', onVv);
        };
    }, [calculateBoardDimension, updateBoardDimension, gameState?.gameId]);

    useLayoutEffect(() => {
        if (!gameState || gameState.status === BlockBlastGameStatus.PLAYING) return;
        void onGameOver();
    }, [gameState?.status, gameState?.gameId, onGameOver]);

    if (!gameState) {
        return (
            <div className="blockblast-loading">
                <div>Loading game…</div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="blockblast-player-container"
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <GridView />
            <ShapePreview />
            <GameOverReport />
            <div
                className="blockblast-info"
                style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    padding: '10px 14px',
                    fontSize: '14px',
                }}
            >
                <div>Score: {gameState.score}</div>
                <div>Lines: {gameState.lines}</div>
                <div>Moves: {gameState.moves}</div>
            </div>
        </div>
    );
};

export default BlockBlastPlayer;
