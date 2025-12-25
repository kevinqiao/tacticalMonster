/**
 * 游戏重播管理器
 * 负责加载、管理和回放游戏事件
 */

import { CombatEvent, GameModel } from "../types/CombatTypes";

export interface ReplayState {
    isPlaying: boolean;
    isPaused: boolean;
    currentIndex: number;
    totalEvents: number;
    currentTime: number;
    totalTime: number;
    playbackSpeed: number;
}

export class GameReplayManager {
    private events: CombatEvent[] = [];
    private initialState: GameModel | null = null;
    private currentIndex: number = 0;
    private isPlaying: boolean = false;
    private isPaused: boolean = false;
    private playbackSpeed: number = 1.0;
    private timeoutId: number | null = null;
    private startTime: number = 0;
    private pauseTime: number = 0;

    // 回调函数
    private onEventProcessed?: (event: CombatEvent) => void;
    private onProgress?: (state: ReplayState) => void;
    private onComplete?: () => void;
    private onError?: (error: Error) => void;

    /**
     * 加载重播数据
     */
    async loadReplay(
        gameId: string,
        loadEvents: (gameId: string) => Promise<CombatEvent[]>,
        loadGame: (gameId: string) => Promise<GameModel | null>
    ): Promise<void> {
        try {
            // 1. 加载所有事件
            const allEvents = await loadEvents(gameId);
            // 过滤掉没有时间戳的事件，并按时间排序
            const sortedEvents = allEvents
                .filter(e => e.time !== undefined)
                .sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

            // 2. 查找 gameInit 事件
            const gameInitEvent = sortedEvents.find(e => e.name === "gameInit");

            if (gameInitEvent && gameInitEvent.data) {
                // 从 gameInit 事件提取初始状态
                this.initialState = this.extractInitialState(gameInitEvent.data);
                // 排除 gameInit 事件
                this.events = sortedEvents.filter(e => e.name !== "gameInit");
            } else {
                // 降级方案：从数据库加载
                const gameData = await loadGame(gameId);
                if (!gameData) {
                    throw new Error("Failed to load game data");
                }
                this.initialState = gameData;
                this.events = sortedEvents;
            }

            // 重置状态
            this.currentIndex = 0;
            this.isPlaying = false;
            this.isPaused = false;
            this.pauseTime = 0;
        } catch (error) {
            if (this.onError) {
                this.onError(error as Error);
            }
            throw error;
        }
    }

    /**
     * 从 gameInit 事件提取初始状态
     */
    private extractInitialState(gameInitData: any): GameModel {
        // 转换后端 GameModel 格式到前端格式
        const mapModel: any = {
            rows: gameInitData.map?.rows || 7,
            cols: gameInitData.map?.cols || 8,
            direction: gameInitData.map?.direction,
            obstacles: gameInitData.map?.obstacles || [],
            disables: gameInitData.map?.disables || [],
        };

        return {
            gameId: gameInitData.gameId,
            map: mapModel,
            playerUid: gameInitData.uid || "",
            characters: [], // 将在 CombatManager 中转换
            currentRound: undefined,
            timeClock: 0,
            score: 0,
        };
    }

    /**
     * 开始回放
     */
    play(): void {
        if (this.isPlaying) return;
        if (this.currentIndex >= this.events.length) {
            // 如果已经播放完，从头开始
            this.currentIndex = 0;
        }

        this.isPlaying = true;
        this.isPaused = false;

        // 计算开始时间
        if (this.pauseTime > 0) {
            // 从暂停位置继续
            this.startTime = performance.now() - this.pauseTime;
        } else {
            // 从头开始或从当前位置继续
            const currentEvent = this.events[this.currentIndex];
            if (currentEvent && currentEvent.time !== undefined) {
                const firstEvent = this.events[0];
                if (firstEvent && firstEvent.time !== undefined) {
                    const elapsedTime = currentEvent.time - firstEvent.time;
                    this.startTime = performance.now() - (elapsedTime / this.playbackSpeed);
                } else {
                    this.startTime = performance.now();
                }
            } else {
                this.startTime = performance.now();
            }
        }

        this.processNextEvent();
    }

    /**
     * 暂停回放
     */
    pause(): void {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.isPaused = true;

        // 计算已播放时间
        const currentEvent = this.events[this.currentIndex];
        if (currentEvent && currentEvent.time !== undefined) {
            const firstEvent = this.events[0];
            if (firstEvent && firstEvent.time !== undefined) {
                const elapsedTime = currentEvent.time - firstEvent.time;
                this.pauseTime = elapsedTime / this.playbackSpeed;
            }
        }

        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * 停止回放
     */
    stop(): void {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.pauseTime = 0;

        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * 跳转到指定时间
     */
    seekTo(targetTime: number): void {
        // 找到目标时间对应的事件索引
        const firstEvent = this.events[0];
        if (!firstEvent || firstEvent.time === undefined) return;

        const targetEventTime = firstEvent.time + targetTime;
        const targetIndex = this.events.findIndex(e => e.time !== undefined && e.time >= targetEventTime);

        if (targetIndex === -1) {
            this.currentIndex = this.events.length;
        } else {
            this.currentIndex = targetIndex;
        }

        // 更新暂停时间
        this.pauseTime = targetTime;

        // 如果正在播放，重新开始
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }

    /**
     * 跳转到指定事件索引
     */
    seekToIndex(index: number): void {
        if (index < 0 || index > this.events.length) return;

        this.currentIndex = index;

        // 更新暂停时间
        const currentEvent = this.events[this.currentIndex];
        if (currentEvent && currentEvent.time !== undefined) {
            const firstEvent = this.events[0];
            if (firstEvent && firstEvent.time !== undefined) {
                const elapsedTime = currentEvent.time - firstEvent.time;
                this.pauseTime = elapsedTime / this.playbackSpeed;
            }
        }

        // 如果正在播放，重新开始
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }

    /**
     * 设置回放速度
     */
    setSpeed(speed: number): void {
        this.playbackSpeed = Math.max(0.25, Math.min(4.0, speed)); // 限制在 0.25x - 4x

        // 如果正在播放，重新计算时间
        if (this.isPlaying) {
            const wasPlaying = this.isPlaying;
            this.pause();
            if (wasPlaying) {
                this.play();
            }
        }
    }

    /**
     * 处理下一个事件
     */
    private processNextEvent(): void {
        if (!this.isPlaying || this.currentIndex >= this.events.length) {
            this.isPlaying = false;
            this.isPaused = false;
            if (this.onComplete) {
                this.onComplete();
            }
            return;
        }

        const event = this.events[this.currentIndex];
        const nextEvent = this.events[this.currentIndex + 1];

        // 计算延迟时间（考虑回放速度）
        let delay = 0;
        if (nextEvent && nextEvent.time !== undefined && event.time !== undefined) {
            delay = (nextEvent.time - event.time) / this.playbackSpeed;
            // 最小延迟 16ms（约 60fps）
            delay = Math.max(16, delay);
        }

        // 处理当前事件
        if (this.onEventProcessed) {
            this.onEventProcessed(event);
        }

        // 更新进度
        if (this.onProgress && event.time !== undefined) {
            const firstEvent = this.events[0];
            const lastEvent = this.events[this.events.length - 1];
            const firstTime = firstEvent?.time ?? 0;
            const lastTime = lastEvent?.time ?? 0;
            const currentTime = event.time - firstTime;
            const totalTime = lastTime - firstTime;

            this.onProgress({
                isPlaying: this.isPlaying,
                isPaused: this.isPaused,
                currentIndex: this.currentIndex + 1,
                totalEvents: this.events.length,
                currentTime,
                totalTime,
                playbackSpeed: this.playbackSpeed,
            });
        }

        this.currentIndex++;

        // 安排下一个事件
        if (this.isPlaying) {
            this.timeoutId = window.setTimeout(() => {
                this.processNextEvent();
            }, delay);
        }
    }

    /**
     * 设置回调函数
     */
    setCallbacks(callbacks: {
        onEventProcessed?: (event: CombatEvent) => void;
        onProgress?: (state: ReplayState) => void;
        onComplete?: () => void;
        onError?: (error: Error) => void;
    }): void {
        this.onEventProcessed = callbacks.onEventProcessed;
        this.onProgress = callbacks.onProgress;
        this.onComplete = callbacks.onComplete;
        this.onError = callbacks.onError;
    }

    /**
     * 获取初始状态
     */
    getInitialState(): GameModel | null {
        return this.initialState;
    }

    /**
     * 获取当前状态
     */
    getState(): ReplayState {
        const firstEvent = this.events[0];
        const lastEvent = this.events[this.events.length - 1];
        const currentEvent = this.events[this.currentIndex];
        const firstTime = firstEvent?.time ?? 0;
        const lastTime = lastEvent?.time ?? 0;
        const currentTime = (currentEvent && currentEvent.time !== undefined)
            ? (currentEvent.time - firstTime)
            : 0;
        const totalTime = lastTime - firstTime;

        return {
            isPlaying: this.isPlaying,
            isPaused: this.isPaused,
            currentIndex: this.currentIndex,
            totalEvents: this.events.length,
            currentTime,
            totalTime,
            playbackSpeed: this.playbackSpeed,
        };
    }

    /**
     * 获取所有事件
     */
    getEvents(): CombatEvent[] {
        return [...this.events];
    }
}

