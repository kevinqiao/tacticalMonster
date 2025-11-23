/**
 * Tactical Monster 事件监听器
 * 重构为单人 PVE 模式：只处理阶段事件（gameInit, roundStart 等），不再处理玩家操作事件
 */

import { useCallback, useEffect } from "react";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
import usePhaseProcessor from "./processor/usePhaseProcessor";

const useEventListener = () => {
    const {
        eventQueue,
        characters,
        gridCells,
        hexCell,
        resourceLoad
    } = useCombatManager();

    const {
        processGameInit,
        processRoundStart,
        processTurnStart,
        processTurnEnd,
        processRoundEnd,
        processTurnSecond
    } = usePhaseProcessor();

    const processEvent = useCallback(() => {
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;

        const onComplete = () => {
            eventQueue.shift();
        };

        event.initTime = event.initTime || Date.now();
        if (Date.now() - event.initTime > 5000) {
            eventQueue.shift();
            return;
        }

        const { name, status, data } = event;

        if (!status) {
            switch (name) {
                // 只处理阶段事件，玩家操作事件已在 useCombatActHandler 中直接处理
                case "gameInit":
                    event.status = 1;
                    processGameInit({ data, onComplete });
                    break;
                case "roundStart":
                case "new_round":
                    event.status = 1;
                    processRoundStart({ data, onComplete });
                    break;
                case "turnStart":
                    event.status = 1;
                    processTurnStart({ data, onComplete });
                    break;
                case "turnSecond":
                    event.status = 1;
                    processTurnSecond({ data, onComplete });
                    break;
                case "turnEnd":
                    event.status = 1;
                    processTurnEnd({ data, onComplete });
                    break;
                case "roundEnd":
                case "end_round":
                    event.status = 1;
                    processRoundEnd({ data, onComplete });
                    break;
                // 玩家操作事件（attack, walk, skillSelect）不再通过事件队列处理
                // 它们已在 useCombatActHandler 中直接执行
                case "attack":
                case "walk":
                case "skillSelect":
                    // 这些事件可能来自后端同步，直接跳过（前端已直接处理）
                    event.status = 1;
                    onComplete();
                    break;
                default:
                    console.log("unknown event", event);
                    eventQueue.shift();
                    break;
            }
        }
    }, [eventQueue, processRoundStart, processTurnStart, processTurnSecond, resourceLoad, processGameInit, processRoundEnd, processTurnEnd]);

    useEffect(() => {
        if (!characters || !gridCells || !hexCell || Object.values(resourceLoad).some(v => v === 0)) return;

        const intervalId = setInterval(() => {
            processEvent();
        }, 100);

        return () => clearInterval(intervalId);
    }, [characters, gridCells, hexCell, resourceLoad, processEvent]);
};

export default useEventListener;


