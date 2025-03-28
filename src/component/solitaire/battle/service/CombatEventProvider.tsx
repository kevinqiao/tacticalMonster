import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";

import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
import useActHandler from "./handler/useActHandler";
import useGameHandler from "./handler/useGameHandler";
import useTurnHandler from "./handler/useTurnHandler";
const enum EventCategory {
    GAME = "game",
    ROUND = "round",
    TURN = "turn",
    ACT = "act",
}
const eventCategoryMap: { [k: string]: EventCategory } = {
    "dealCompleted": EventCategory.GAME,
    "shuffleCompleted": EventCategory.GAME,
    "flip": EventCategory.ACT,
    "move": EventCategory.ACT,
    "askAct": EventCategory.ACT,
    "roundStarted": EventCategory.TURN,
    "turnStarted": EventCategory.TURN,
}
const CombatEventProvider = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { game, eventQueue, boardDimension, askAct, completeAct, direction } = useCombatManager();
    const gameHandler = useGameHandler();
    const actHandler = useActHandler();
    const turnHandler = useTurnHandler();


    const processEvent = useCallback(() => {

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
                default:
                    onComplete();
                    break;
            }
            switch (name) {
                // case "dealCompleted":
                //     event.status = 1;
                //     playDeal({ data: event.data, onComplete: () => { onComplete() } });
                //     break;
                // case "shuffleCompleted":
                //     event.status = 1;
                //     playShuffle({ data: event.data, onComplete: () => { onComplete() } });
                //     break;
                // case "flip":
                //     event.status = 1;
                //     playOpenCard({
                //         cards: event.data.open, onComplete: () => {
                //             if (game.currentTurn?.actions) {
                //                 game.currentTurn.actions.acted++;
                //             }
                //             completeAct();
                //             onComplete()
                //         }
                //     });
                //     break;
                // case "move":
                //     event.status = 1;
                //     console.log("move", event)
                //     playMoveCard({
                //         data: event.data, onComplete: () => {
                //             if (game.currentTurn?.actions) {
                //                 game.currentTurn.actions.acted++;
                //             }
                //             completeAct();
                //             onComplete()
                //         }
                //     });
                //     break;
                // case "roundStarted":
                //     event.status = 1
                //     game.currentRound = event.data.round;
                //     console.log("roundStarted", game.currentRound)
                //     onComplete();
                //     break;
                // case "turnStarted":
                //     event.status = 1
                //     game.currentTurn = event.data;
                //     onComplete();
                //     break;
                // case "askAct":
                //     event.status = 1;
                //     console.log("askAct", event)
                //     askAct(event.data.dueTime);
                //     onComplete();
                //     break;
                // default:
                //     event.status = 1;
                //     console.log("unknown event", event)
                //     onComplete();
                //     break;
            }

        }

    }, [user, game, eventQueue, boardDimension, direction, askAct, completeAct])


    useEffect(() => {

        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user, processEvent]);

    return <>{children}</>
}
export default CombatEventProvider

