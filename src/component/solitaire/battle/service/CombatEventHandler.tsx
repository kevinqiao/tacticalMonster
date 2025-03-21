import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";

import useActionAnimate from "../animation/useActionAnimate";
import useCardAnimate from "../animation/useCardAnimate";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
const CombatEventHandler = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { game, eventQueue, boardDimension } = useCombatManager();
    const { playDeal, playShuffle } = useCardAnimate();
    const { playOpenCard, playMoveCard } = useActionAnimate();

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

            switch (name) {
                case "dealCompleted":
                    event.status = 1;
                    console.log("deal", event)
                    playDeal({ data: event.data, onComplete: () => { onComplete() } });
                    break;
                case "shuffleCompleted":
                    event.status = 1;
                    console.log("shuffle", event)
                    playShuffle({ data: event.data, onComplete: () => { onComplete() } });
                    break;
                case "flipCompleted":
                    event.status = 1;
                    console.log("flip", event)
                    playOpenCard({ cards: event.data.open, onComplete: () => { onComplete() } });
                    break;
                case "moveCompleted":
                    event.status = 1;
                    console.log("move", event)
                    playMoveCard({ data: event.data, onComplete });
                    break;
                default:
                    event.status = 1;
                    console.log("unknown event", event)
                    onComplete();
                    break;
            }

        }

    }, [user, game, eventQueue, boardDimension])


    useEffect(() => {

        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user, processEvent]);

    return <>{children}</>
}
export default CombatEventHandler

