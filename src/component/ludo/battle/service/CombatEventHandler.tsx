import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";


const CombatEventHandler = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { eventQueue } = useCombatManager();



    const processEvent = useCallback(() => {
        // console.log("event size:"+eventQueue.length)
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;

        const onComplete = () => {
            eventQueue.shift();
        }

        event.initTime = event.initTime || Date.now();
        if (Date.now() - event.initTime > 5000) {
            const e = eventQueue.shift();
            return;
        }
        const { name, status, data } = event;

        if (!status) {

            switch (name) {
                case "attack":
                    event.status = 1;
                    break;
                case "walk":
                    event.status = 1;

                    break;
                case "gameInit":
                    event.status = 1;

                    break;
                case "roundStart":
                    event.status = 1;

                    break;
                case "turnStart":
                    event.status = 1;

                    break;

                case "turnEnd":
                    event.status = 1;

                    break;
                case "roundEnd":
                    event.status = 1;
                    break;
                case "skillSelect":
                    event.status = 1;

                    break;

                default:
                    console.log("unknown event", event)
                    eventQueue.shift();
                    break;
            }

        }

    }, [user, eventQueue])


    useEffect(() => {

        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user]);

    return <>{children}</>
}
export default CombatEventHandler

