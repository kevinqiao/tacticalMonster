import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";

import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
import useActHandler from "./handler/useActHandler";
import useGameHandler from "./handler/useGameHandler";
import useTurnHandler from "./handler/useTurnHandler";
const enum EventCategory {
    GAME = "game",
    TURN = "turn",
    ACT = "act",
    LOCAL = "local",
}
const eventCategoryMap: { [k: string]: EventCategory } = {
    "dealCompleted": EventCategory.GAME,
    "shuffleCompleted": EventCategory.GAME,
    "flip": EventCategory.ACT,
    "move": EventCategory.ACT,
    "askAct": EventCategory.ACT,
    "roundStarted": EventCategory.TURN,
    "turnStarted": EventCategory.TURN,
    "turnOver": EventCategory.TURN,
    "roundOver": EventCategory.TURN,
    "localAct": EventCategory.LOCAL,
}
const CombatEventProvider = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { game, eventQueue, boardDimension, askAct, completeAct, direction } = useCombatManager();
    const gameHandler = useGameHandler();
    const actHandler = useActHandler();
    const turnHandler = useTurnHandler();
    const dispatchEvent = useCallback(() => {

        if (!game) return;
        // console.log("processEvent", game);
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event || event.status === 1) return;
        // console.log("events:", eventQueue.length, event)
        const onComplete = () => {
            // playCountStop();
            const e = eventQueue.shift();
        }

        event.initTime = event.initTime || Date.now();
        // if (Date.now() - event.initTime > 5000) {
        //     const e = eventQueue.shift();
        //     return;
        // }
        console.log("processEvent", event)
        const { name, status, data } = event;

        if (!status) {
            event.status = 1;
            const category = eventCategoryMap[name];
            switch (category) {
                case EventCategory.GAME:
                    gameHandler.handleEvent(event, onComplete);
                    break;
                case EventCategory.ACT:
                    actHandler.handleEvent(event, onComplete);
                    break;
                case EventCategory.TURN:
                    turnHandler.handleEvent(event, onComplete);
                    break;
                case EventCategory.LOCAL:

                    break;
                default:
                    onComplete();
                    break;
            }
        }

    }, [user, game, eventQueue, boardDimension, direction, askAct, completeAct])


    useEffect(() => {

        const intervalId = setInterval(() => {
            dispatchEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user, dispatchEvent]);

    return <>{children}</>
}
export default CombatEventProvider

