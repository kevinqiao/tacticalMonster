import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
import useActionProcessor from "./processor/useActionProcessor";

const CombatEventHandler = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { eventQueue } = useCombatManager();
    const { processRoll } = useActionProcessor();


    const processEvent = useCallback(() => {

        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;
        const onComplete = (initTime: number | undefined) => {
            console.log("onComplete", initTime)
            const pos = eventQueue.findIndex((e) => e.initTime === initTime);
            eventQueue.splice(pos, 1);
            // eventQueue.shift();
            console.log("onComplete over", eventQueue)
        }

        event.initTime = event.initTime || Date.now();
        if (Date.now() - event.initTime > 5000) {
            const e = eventQueue.shift();
            return;
        }
        const { name, status, data } = event;

        if (!status) {

            switch (name) {
                case "roll":
                    console.log("roll:", data)
                    event.status = 1;
                    processRoll(data.seatNo, () => onComplete(event.initTime));
                    break;
                case "select":
                    event.status = 1;

                    break;
                case "skillSelect":
                    event.status = 1;

                    break;
                case "turnStart":
                    event.status = 1;

                    break;
                case "roundStart":
                    event.status = 1;

                    break;

                default:
                    console.log("unknown event", event)
                    eventQueue.shift();
                    break;
            }

        }

    }, [user, eventQueue, processRoll])


    useEffect(() => {

        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user, processEvent]);

    return <>{children}</>
}
export default CombatEventHandler

