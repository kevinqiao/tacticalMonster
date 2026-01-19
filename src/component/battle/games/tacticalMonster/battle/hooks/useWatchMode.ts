/**
 * Watch 模式 Hook
 * 处理实时观看模式的事件查询和处理
 * 
 * 职责：
 * - 实时查询新事件（通过 useQuery）
 * - 将事件推入事件队列
 * - 收集已处理的事件（用于实时计算分数）
 * - 管理 lastTime 状态（用于增量查询）
 */

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../../../convex/tacticalMonster/convex/_generated/api";
import { FrontendCombatEvent } from "../types/CombatTypes";

interface UseWatchModeOptions {
    gameId: string | null | undefined;
    mode: 'play' | 'watch' | 'replay';
    eventQueueRef: React.MutableRefObject<FrontendCombatEvent[]>;
}

interface UseWatchModeReturn {
    processedEvents: FrontendCombatEvent[];  // 已处理的事件列表（用于实时计算分数）
}

export function useWatchMode({ gameId, mode, eventQueueRef }: UseWatchModeOptions): UseWatchModeReturn {
    const [lastTime, setLastTime] = useState<number | undefined>(undefined);
    const [processedEvents, setProcessedEvents] = useState<FrontendCombatEvent[]>([]);

    // ✅ 查询事件（仅 watch 模式需要实时查询）
    // - play 模式：不通过事件队列查询，事件由后端响应直接处理（通过 phaseChanges）
    // - watch 模式：实时查询新事件，但不允许操作
    // - replay 模式：跳过查询（使用 findAllEvents 一次性加载）
    const events: any = useQuery(
        api.service.game.gameService.findEvents,
        (gameId && mode === 'watch') ? { gameId, lastTime } : "skip"
    );

    // ✅ 处理事件更新（仅 watch 模式需要）
    // 此 useEffect 监听 events 变化（来自 useQuery），将新事件推入 eventQueue
    // - play 模式：不通过事件队列，事件由后端响应直接处理（通过 phaseChanges）
    // - replay 模式：跳过此处理（事件由 GameReplayManager 通过回调注入）
    useEffect(() => {
        // 只处理 watch 模式
        if (mode !== 'watch') return;

        if (Array.isArray(events) && events.length > 0) {
            events.forEach((backendEvent: any) => {
                // ✅ 方案1：乐观UI + 悲观状态，所有后端事件都是真实事件，直接添加
                eventQueueRef.current.push(backendEvent);

                // ✅ Watch 模式：收集已处理的事件用于实时计算分数
                setProcessedEvents(prev => {
                    // ✅ 使用 stepTime 去重（代替 _id）
                    // stepTime 是相对时间位置，比 _id 更语义化，也更可靠
                    const exists = prev.some(e =>
                        e.stepTime === backendEvent.stepTime ||  // ✅ 主要去重方式
                        (e.time === backendEvent.time && e.name === backendEvent.name)  // 备用去重方式
                    );
                    if (!exists) {
                        return [...prev, backendEvent];
                    }
                    return prev;
                });
            });

            const lastEvent = events[events.length - 1];
            setLastTime(lastEvent.time);
        }
    }, [events, mode, eventQueueRef]);

    return {
        processedEvents: mode === 'watch' ? processedEvents : []
    };
}
