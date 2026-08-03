/**
 * 本 hook 内部持有 eventQueue（ref），负责：
 * - Watch：订阅 Convex findEvents 并 push 入队
 *
 * 消费队列仍在 useWatchOrReplay / useEventHandler 的 processEvent 中。
 */

import { useQuery } from "convex/react";
import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../../../convex/tacticalMonster/convex/_generated/api";
import type { FrontendCombatEvent } from "../../types/CombatTypes";

interface UseWatchEventIngestOptions {
    gameId: string | null | undefined;
    mode: "play" | "watch" | "replay";
}

/**
 * @returns 与观战/重播消费逻辑共用的队列 ref（同数组实例贯穿本局 UI）
 */
export function useWatchEventIngest({
    gameId,
    mode,
}: UseWatchEventIngestOptions): MutableRefObject<FrontendCombatEvent[]> {
    const eventQueueRef = useRef<FrontendCombatEvent[]>([]);

    const [lastTime, setLastTime] = useState<number | undefined>(undefined);

    const events = useQuery(
        api.service.game.gameService.findEvents,
        gameId && mode === "watch" ? { gameId, lastTime } : "skip"
    );

    useEffect(() => {
        if (mode !== "watch") return;

        if (Array.isArray(events) && events.length > 0) {
            events.forEach((backendEvent: FrontendCombatEvent) => {
                eventQueueRef.current.push(backendEvent);
            });

            const lastEvent = events[events.length - 1];
            setLastTime(lastEvent.time);
        }
    }, [events, mode]);

    return eventQueueRef;
}
