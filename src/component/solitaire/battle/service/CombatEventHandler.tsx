import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";

import useCardAnimate from "../animation/useCardAnimate";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
const CombatEventHandler = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { game, eventQueue, boardDimension } = useCombatManager();
    const { playDeal } = useCardAnimate();

    const processEvent = useCallback(() => {

        if (!game) return;
        // console.log("processEvent", game);
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event || event.status === 1) return;
        console.log("events:", eventQueue.length)
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
                case "deal":
                    event.status = 1;
                    console.log("deal", event)
                    playDeal({ onComplete: () => { onComplete() } });
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

