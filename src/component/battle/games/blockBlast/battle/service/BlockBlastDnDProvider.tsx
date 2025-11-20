/**
 * Block Blast 拖拽服务
 * 基于 solitaireSolo 的 SoloDnDProvider 设计模式
 */

import gsap from 'gsap';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    ActionStatus,
    BlockBlastActionData,
    BoardDimension,
    Shape
} from '../types/BlockBlastTypes';
import { useBlockBlastGameManager } from './GameManager';
import useActHandler from './handler/useActHandler';

interface IBlockBlastDnDContext {
    actionData: BlockBlastActionData | null;
    isTouchDevice: boolean;
    onDragStart: (shape: Shape, event: React.MouseEvent | React.TouchEvent) => void;
    onDragMove: (event: React.MouseEvent | React.TouchEvent) => void;
    onDragEnd: (event: React.MouseEvent | React.TouchEvent) => void;
    getDragPosition: (event: React.MouseEvent | React.TouchEvent) => { x: number; y: number };
}

const BlockBlastDnDContext = createContext<IBlockBlastDnDContext>({
    actionData: null,
    isTouchDevice: false,
    onDragStart: () => { },
    onDragMove: () => { },
    onDragEnd: () => { },
    getDragPosition: () => ({ x: 0, y: 0 })
});

export const useBlockBlastDnDManager = () => {
    const context = useContext(BlockBlastDnDContext);
    if (!context) {
        throw new Error('useBlockBlastDnDManager must be used within a BlockBlastDnDProvider');
    }
    return context;
};

interface BlockBlastDnDProviderProps {
    children: ReactNode;
}

export const BlockBlastDnDProvider: React.FC<BlockBlastDnDProviderProps> = ({ children }) => {
    const actionDataRef = useRef<BlockBlastActionData>({});
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const { gameState, ruleManager, boardDimension } = useBlockBlastGameManager();
    const { onDrop } = useActHandler();

    // 检测是否为触摸设备
    useEffect(() => {
        const checkTouchDevice = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouchDevice();
        window.addEventListener('resize', checkTouchDevice);
        return () => window.removeEventListener('resize', checkTouchDevice);
    }, []);

    // 获取鼠标或触摸位置
    const getDragPosition = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in event) {
            const touch = event.touches[0] || event.changedTouches[0];
            return { x: touch.clientX, y: touch.clientY };
        } else {
            return { x: event.clientX, y: event.clientY };
        }
    }, []);

    // 开始拖拽
    const onDragStart = useCallback((shape: Shape, event: React.MouseEvent | React.TouchEvent) => {
        if (!ruleManager || !shape.ele || !gameState || gameState.actionStatus !== ActionStatus.IDLE) return;
        gameState.actionStatus = ActionStatus.ACTING;
        event.preventDefault();
        event.stopPropagation();
        const position = getDragPosition(event);
        startPositionRef.current = position;
        const rect = shape.ele.getBoundingClientRect();
        const dragData: BlockBlastActionData = {
            shape,
            offsetX: position.x - rect.left,
            offsetY: position.y - rect.top,
            lastPosition: position,
            status: 'acting'
        };
        Object.assign(actionDataRef.current, dragData);
        if (shape.ele) {
            gsap.set(shape.ele, { zIndex: 99999 });
        }
    }, [gameState, ruleManager, getDragPosition]);

    // 拖拽移动
    const onDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (gameState?.actionStatus !== ActionStatus.ACTING || !boardDimension || !gameState) return;

        const shape = actionDataRef.current.shape;
        if (!shape || !shape.ele) return;
        const position = getDragPosition(event);
        const { offsetX, offsetY, lastPosition } = actionDataRef.current;
        const { left, top } = boardDimension as BoardDimension;

        const x = position.x - left - (offsetX || 0);
        const y = position.y - top - (offsetY || 0);

        // 只在位置变化较大时重新检测
        const distance = lastPosition ? Math.sqrt(
            Math.pow(position.x - lastPosition.x, 2) +
            Math.pow(position.y - lastPosition.y, 2)
        ) : 10;

        if (distance > 10) {
            // 计算网格位置
            const cellSize = boardDimension.cellSize;
            const gridX = boardDimension.grid.x;
            const gridY = boardDimension.grid.y;
            const col = Math.floor((x - gridX) / cellSize);
            const row = Math.floor((y - gridY) / cellSize);

            // 验证是否可以放置
            if (col >= 0 && col < 10 && row >= 0 && row < 10) {
                const canPlace = ruleManager?.canPlaceShape(shape, { row, col }) || false;
                actionDataRef.current.position = canPlace ? { row, col } : undefined;
            } else {
                actionDataRef.current.position = undefined;
            }
        }

        actionDataRef.current.lastPosition = position;
        actionDataRef.current.status = 'dragging';

        // 更新形状位置
        if (shape.ele) {
            gsap.set(shape.ele, {
                x: x,
                y: y,
            });
        }
    }, [gameState, ruleManager, boardDimension, getDragPosition]);

    // 拖拽结束
    const onDragEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
        if (gameState?.actionStatus !== ActionStatus.ACTING || !gameState) return;

        const shape = actionDataRef.current.shape;
        const position = actionDataRef.current.position;

        if (shape && position && ruleManager?.canPlaceShape(shape, position)) {
            actionDataRef.current.status = 'dropping';
            onDrop(shape, position);
        } else {
            // 取消拖拽，恢复位置
            actionDataRef.current.status = 'cancelled';
            if (shape?.ele) {
                gsap.to(shape.ele, {
                    x: 0,
                    y: 0,
                    duration: 0.3,
                    ease: 'back.out',
                    onComplete: () => {
                        gameState.actionStatus = ActionStatus.IDLE;
                    }
                });
            } else {
                gameState.actionStatus = ActionStatus.IDLE;
            }
        }

        actionDataRef.current = {};
    }, [gameState, ruleManager, onDrop]);

    const value: IBlockBlastDnDContext = {
        actionData: actionDataRef.current,
        isTouchDevice,
        onDragStart,
        onDragMove,
        onDragEnd,
        getDragPosition
    };

    return (
        <BlockBlastDnDContext.Provider value={value}>
            {children}
        </BlockBlastDnDContext.Provider>
    );
};

export default BlockBlastDnDProvider;

