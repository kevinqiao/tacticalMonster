import { useCallback, useEffect } from "react";
import { CombatEvent, EVENT_TYPE } from "../model/CombatModels";
import { useCombatManager } from "./CombatManager";

const useEventHandler = () => {

    const combat = useCombatManager();
    const { eventQueue } = combat;
    const processEvent = useCallback(() => {
        // console.log(eventQueue)
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;
        const { type, name,status, gameId, time, data } = event;
        if (status === 0) {
            event.status = 1;
            if (type === EVENT_TYPE.ACTION) {
                if (name === "walk") {
                   console.log("walk",data);
                   eventQueue.shift();
                }
            }
        }

    }, [])


    useEffect(() => {
        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, []);


}
export default useEventHandler