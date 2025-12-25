/**
 * 游戏重播 Hook
 */
import { useConvex } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../../../../convex/tacticalMonster/convex/_generated/api';
import { GameReplayManager, ReplayState } from '../service/GameReplayManager';
import { CombatEvent, GameModel } from '../types/CombatTypes';

export function useGameReplay(gameId: string | null, mode: 'play' | 'watch' | 'replay') {
    const convex = useConvex();
    const replayManagerRef = useRef<GameReplayManager | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initialState, setInitialState] = useState<GameModel | null>(null);
    const [replayState, setReplayState] = useState<ReplayState>({
        isPlaying: false,
        isPaused: false,
        currentIndex: 0,
        totalEvents: 0,
        currentTime: 0,
        totalTime: 0,
        playbackSpeed: 1.0,
    });
    const [error, setError] = useState<Error | null>(null);

    // 事件处理回调
    const onEventProcessedRef = useRef<((event: CombatEvent) => void) | null>(null);

    /**
     * 加载重播数据
     */
    const loadReplay = useCallback(async () => {
        if (!gameId || mode !== 'replay') return;

        try {
            setIsLoading(true);
            setError(null);

            const manager = new GameReplayManager();
            replayManagerRef.current = manager;

            // 设置回调
            manager.setCallbacks({
                onEventProcessed: (event) => {
                    if (onEventProcessedRef.current) {
                        onEventProcessedRef.current(event);
                    }
                },
                onProgress: (state) => {
                    setReplayState(state);
                },
                onComplete: () => {
                    setReplayState(prev => ({ ...prev, isPlaying: false }));
                },
                onError: (err) => {
                    setError(err);
                },
            });

            // 加载重播数据
            await manager.loadReplay(
                gameId,
                // 加载事件
                async (id: string) => {
                    const events = await convex.query(
                        (api as any).service.game.gameService.findAllEvents,
                        { gameId: id }
                    );
                    return events || [];
                },
                // 加载游戏（降级方案）
                async (id: string) => {
                    const result = await convex.query(
                        (api as any).service.game.gameService.loadGame,
                        { gameId: id }
                    );
                    return result?.ok ? result.data : null;
                }
            );

            // 获取初始状态
            const initialState = manager.getInitialState();
            setInitialState(initialState);

            // 更新状态
            setReplayState(manager.getState());
            setIsLoading(false);
        } catch (err) {
            setError(err as Error);
            setIsLoading(false);
        }
    }, [gameId, mode, convex]);

    /**
     * 设置事件处理回调
     */
    const setOnEventProcessed = useCallback((callback: (event: CombatEvent) => void) => {
        onEventProcessedRef.current = callback;
    }, []);

    /**
     * 播放
     */
    const play = useCallback(() => {
        replayManagerRef.current?.play();
    }, []);

    /**
     * 暂停
     */
    const pause = useCallback(() => {
        replayManagerRef.current?.pause();
    }, []);

    /**
     * 停止
     */
    const stop = useCallback(() => {
        replayManagerRef.current?.stop();
    }, []);

    /**
     * 跳转到指定时间
     */
    const seekTo = useCallback((time: number) => {
        replayManagerRef.current?.seekTo(time);
    }, []);

    /**
     * 跳转到指定索引
     */
    const seekToIndex = useCallback((index: number) => {
        replayManagerRef.current?.seekToIndex(index);
    }, []);

    /**
     * 设置回放速度
     */
    const setSpeed = useCallback((speed: number) => {
        replayManagerRef.current?.setSpeed(speed);
    }, []);

    /**
     * 加载重播数据
     */
    useEffect(() => {
        loadReplay();
    }, [loadReplay]);

    /**
     * 清理
     */
    useEffect(() => {
        return () => {
            replayManagerRef.current?.stop();
        };
    }, []);

    /**
     * 获取所有事件（用于计分计算）
     */
    const getAllEvents = useCallback((): CombatEvent[] => {
        return replayManagerRef.current?.getEvents() || [];
    }, []);

    return {
        isLoading,
        initialState,
        replayState,
        error,
        play,
        pause,
        stop,
        seekTo,
        seekToIndex,
        setSpeed,
        setOnEventProcessed,
        getAllEvents  // ✅ 新增：获取所有事件
    };
}

