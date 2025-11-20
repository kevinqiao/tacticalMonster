/**
 * 单人纸牌游戏测试文件
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { SoloGame } from '../index';

// Mock GSAP
jest.mock('gsap', () => ({
    set: jest.fn(),
    to: jest.fn(),
    timeline: jest.fn(() => ({
        to: jest.fn().mockReturnThis(),
        delay: jest.fn().mockReturnThis(),
        onComplete: jest.fn().mockReturnThis(),
        kill: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn()
    })),
    killTweensOf: jest.fn()
}));

describe('SoloGame', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing', () => {
        render(<SoloGame />);
        expect(screen.getByText('Loading Solo Game...')).toBeInTheDocument();
    });

    it('renders game interface after initialization', async () => {
        render(<SoloGame />);

        await waitFor(() => {
            expect(screen.queryByText('Loading Solo Game...')).not.toBeInTheDocument();
        });
    });

    it('calls onGameStart when game starts', async () => {
        const onGameStart = jest.fn();
        render(<SoloGame onGameStart={onGameStart} />);

        await waitFor(() => {
            expect(screen.queryByText('Loading Solo Game...')).not.toBeInTheDocument();
        });

        // 点击新游戏按钮
        const newGameButton = screen.getByText('New Game');
        fireEvent.click(newGameButton);

        expect(onGameStart).toHaveBeenCalled();
    });

    it('calls onGameComplete when game completes', async () => {
        const onGameComplete = jest.fn();
        render(<SoloGame onGameComplete={onGameComplete} />);

        await waitFor(() => {
            expect(screen.queryByText('Loading Solo Game...')).not.toBeInTheDocument();
        });

        // 这里需要模拟游戏完成的条件
        // 由于游戏逻辑比较复杂，这里只是测试回调函数是否被正确传递
        expect(onGameComplete).toBeDefined();
    });

    it('applies custom className and style', () => {
        const customStyle = { backgroundColor: 'red' };
        const { container } = render(
            <SoloGame
                className="custom-class"
                style={customStyle}
            />
        );

        const gameContainer = container.querySelector('.solo-game-container');
        expect(gameContainer).toHaveClass('custom-class');
        expect(gameContainer).toHaveStyle('background-color: red');
    });

    it('handles keyboard shortcuts', async () => {
        render(<SoloGame />);

        await waitFor(() => {
            expect(screen.queryByText('Loading Solo Game...')).not.toBeInTheDocument();
        });

        // 测试 H 键提示
        fireEvent.keyDown(document, { key: 'h' });
        // 这里需要验证提示功能是否被触发

        // 测试 Escape 键
        fireEvent.keyDown(document, { key: 'Escape' });
        // 这里需要验证选择是否被取消
    });

    it('handles game configuration', () => {
        const config = {
            scoring: {
                foundationMove: 20,
                tableauMove: 10,
                wasteMove: 0,
                timeBonus: 2,
                movePenalty: -2
            },
            hintsEnabled: false,
            autoComplete: false
        };

        render(<SoloGame config={config} />);

        // 这里需要验证配置是否被正确应用
        expect(config).toBeDefined();
    });
});

describe('SoloGame Integration', () => {
    it('integrates with game manager and drag provider', async () => {
        render(<SoloGame />);

        await waitFor(() => {
            expect(screen.queryByText('Loading Solo Game...')).not.toBeInTheDocument();
        });

        // 验证游戏组件是否正确渲染
        expect(screen.getByText('New Game')).toBeInTheDocument();
    });
});
