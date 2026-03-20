/**
 * 回合顺序条（先攻条）- Braveland 式全局排序展示
 * 左下角横排；展示 monsterId、血条、攻击范围；
 * 最左侧永远为当前 turn；完成时左移消失后在序列最右侧重新出现。
 * 动画由 GSAP 驱动，支持 playbackSpeed 同步。
 */

import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCombatManager } from "../../../service/CombatManager";
import { usePlayTurnBar } from "../../animation/usePlayTurnBar";
import { SeparatorSprite } from "./SeparatorSprite";
import { TurnItemSprite } from "./TurnItemSprite";

export type TurnBarDimension = {
    itemWidth: number;
    itemHeight: number;
    separatorWidth: number;
};

export type TurnBarItem = {
    character_id: string;
    index?: number;
    ele?: HTMLDivElement;
    status: number;
    order?: number;
    turnKey?: string;
};
type TurnBarPhaseEvent = { name: string, data: any };
type TurnBarQueuedEvent = { status: number, phaseChangeEvent: TurnBarPhaseEvent };
type QueueableTurnBarEventName = "init" | "turnStart" | "turnEnd" | "roundEnd" | "roundStart";

const getSeparatorIndexFromRound = (round: any): number => {
    const size = round?.turns?.length ?? 0;
    const todos = round?.turns
        ?.filter((turn: any) => turn.status !== 2)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    return (todos?.length === 0 || todos?.length === size) ? size : (todos?.length ?? 0);
};
const getPhaseEventKey = (evt: { name: string, data: any } | null | undefined): string => {
    if (!evt) return "";
    const data = evt.data ?? {};
    if (evt.name === "turnStart") {
        const turn = data.turn ?? data;
        const roundNo = data.currentRound?.no ?? "";
        const actorId = turn?.character_id ?? data.character_id ?? "";
        const order = turn?.order ?? "";
        return `${evt.name}:${roundNo}:${actorId}:${order}`;
    }
    if (evt.name === "roundStart") {
        const roundNo = data.round?.no ?? data.round ?? "";
        return `${evt.name}:${roundNo}`;
    }
    if (evt.name === "init") {
        const roundNo = data?.no ?? "";
        return `${evt.name}:${roundNo}`;
    }
    return `${evt.name}`;
};
const QUEUEABLE_EVENT_NAMES: QueueableTurnBarEventName[] = ["init", "turnStart", "turnEnd", "roundEnd", "roundStart"];
const isQueueableTurnBarEvent = (evt: TurnBarPhaseEvent | null | undefined): evt is TurnBarPhaseEvent => {
    if (!evt) return false;
    return (QUEUEABLE_EVENT_NAMES as string[]).includes(evt.name);
};
const enqueueIfNotDuplicate = (queue: TurnBarQueuedEvent[], phaseChangeEvent: TurnBarPhaseEvent) => {
    const nextKey = getPhaseEventKey(phaseChangeEvent);
    const last = queue[queue.length - 1];
    const lastKey = getPhaseEventKey(last?.phaseChangeEvent);
    if (nextKey !== lastKey) {
        queue.push({ status: 0, phaseChangeEvent });
    }
};

export const TurnOrderBar: React.FC = () => {
    const { game, mapDimension, phaseChangeEvent, characters, mode, playbackSpeed = 1.0 } = useCombatManager();
    const phaseChangeEventQueueRef = useRef<TurnBarQueuedEvent[]>([]);
    const initQueuedGameKeyRef = useRef<string | null>(null);
    const initProcessedRef = useRef(false);
    const firstTurnStartAfterInitHandledRef = useRef(false);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const turnBarItemsMapRef = useRef<Map<string, TurnBarItem>>(new Map());
    const [separator, setSeparator] = useState<{ ele: HTMLDivElement | null, txtEle: HTMLDivElement | null, nextRound: number, index: number }>({
        ele: null,
        txtEle: null,
        nextRound: (game?.currentRound?.no ?? 0) + 1,
        index: getSeparatorIndexFromRound(game?.currentRound),
    });
    const dimension = useMemo(() => {
        if (!mapDimension) return null;
        const w = mapDimension.containerWidth / (8 + 1 + 0.5);
        const h = w * 1.2;
        const dh = ((mapDimension.containerHeight - mapDimension.height) / 2) + (mapDimension.topOffset ?? 0) - 10;
        const itemHeight = Math.min(dh, h);
        const itemWidth = itemHeight / 1.2;
        const separatorWidth = itemWidth * 0.3;
        return { itemWidth, itemHeight, separatorWidth };
    }, [mapDimension]);

    const trackRef = useRef<HTMLDivElement | null>(null);

    const { playInitTurn, playStartTurn, playStartRound } = usePlayTurnBar({
        dimension,
        itemsMapRef: turnBarItemsMapRef,
        separator,
        trackRef,
        playbackSpeed,
    });
    const enqueuePhaseEvent = useCallback((evt: TurnBarPhaseEvent) => {
        enqueueIfNotDuplicate(phaseChangeEventQueueRef.current, evt);
    }, []);

    // gameId 为空时重置“已入队 init”标记，保证新一局时门控生效
    useEffect(() => {
        if (game?.gameId == null || game?.gameId === "") {
            initQueuedGameKeyRef.current = null;
        }
    }, [game?.gameId]);

    // 仅在存在有效 gameId 且 currentRound 时入队一次 init；插入队列前端，确保先于已入队的 turnStart 执行
    useEffect(() => {
        const gameId = game?.gameId;
        if (gameId == null || gameId === "" || !game?.currentRound) return;
        const gameKey = String(gameId);
        if (initQueuedGameKeyRef.current === gameKey) return;
        initQueuedGameKeyRef.current = gameKey;
        initProcessedRef.current = false;
        firstTurnStartAfterInitHandledRef.current = false;
        const queue = phaseChangeEventQueueRef.current;
        const initEvt = { status: 0 as const, phaseChangeEvent: { name: "init" as const, data: game.currentRound } };
        queue.unshift(initEvt);
    }, [game?.gameId, game?.currentRound]);

    useEffect(() => {
        if (!isQueueableTurnBarEvent(phaseChangeEvent)) return;
        if (phaseChangeEvent.name === "init") return;
        enqueuePhaseEvent(phaseChangeEvent);
    }, [enqueuePhaseEvent, phaseChangeEvent, mode]);


    // 依赖布局的回合事件：未为本局入队过 init 前不消费，避免先执行 turnStart 再 init 导致高亮错位
    const requiresLayoutEventNames: QueueableTurnBarEventName[] = ["turnStart", "roundStart"];
    const headRequiresLayout = (evt: TurnBarPhaseEvent | undefined) =>
        evt && (requiresLayoutEventNames as string[]).includes(evt.name);

    useEffect(() => {
        const processEvent = () => {
            const queue = phaseChangeEventQueueRef.current;
            const timelineActive = timelineRef.current !== null && timelineRef.current.isActive();
            if (queue.length === 0 || timelineActive) return;

            const turn = queue[0];
            if (turn.status === 0 && headRequiresLayout(turn.phaseChangeEvent) && initQueuedGameKeyRef.current === null) {
                return;
            }
            if (turn.status === 2) {
                if (turn.phaseChangeEvent.name === "init") {
                    initProcessedRef.current = true;
                }
                queue.shift();
                return;
            }

            if (turn.status !== 0) return;

            console.log("event:", turn.phaseChangeEvent);
            turn.status = 1;
            timelineRef.current = gsap.timeline({
                onComplete: () => {
                    console.log("timeline complete");
                    timelineRef.current = null;
                },
            });

            const completeImmediately = () => {
                turn.status = 2;
                timelineRef.current?.play();
            };

            switch (turn.phaseChangeEvent.name) {
                case "init":
                    playInitTurn(turn, timelineRef.current);
                    return;
                case "turnStart": {
                    const skipHighlightForFirstTurnStartAfterInit =
                        initProcessedRef.current && !firstTurnStartAfterInitHandledRef.current;
                    if (skipHighlightForFirstTurnStartAfterInit) {
                        firstTurnStartAfterInitHandledRef.current = true;
                    }
                    playStartTurn(turn, timelineRef.current, {
                        animateHighlight: !skipHighlightForFirstTurnStartAfterInit,
                    });
                    return;
                }
                case "turnEnd":
                    console.log("turn end", turn.phaseChangeEvent);
                    completeImmediately();
                    return;
                case "roundEnd":
                    console.log("round end", turn.phaseChangeEvent);
                    completeImmediately();
                    return;
                case "roundStart":
                    console.log("round start", turn.phaseChangeEvent);
                    playStartRound(turn, timelineRef.current);
                    return;
                default:
                    completeImmediately();
                    return;
            }
        };
        processEvent();
        const intervalId = setInterval(processEvent, 100);
        return () => clearInterval(intervalId);
    }, [mode, playInitTurn, playStartTurn, playStartRound]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: dimension?.itemHeight ?? 1,
            }}
        >
            <div
                ref={trackRef}
                style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: "100%" }}
            >
                {characters?.map((char, index) =>
                    <TurnItemSprite
                        key={char.character_id}
                        character={char}
                        itemsMapRef={turnBarItemsMapRef}
                        dimension={dimension}
                    />
                )}
                <SeparatorSprite dimension={dimension} separator={separator} />
            </div>
        </div>
    );
};
