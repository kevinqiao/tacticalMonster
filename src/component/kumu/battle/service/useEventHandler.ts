import { useCallback, useEffect } from "react";
import { CombatEvent } from "../model/CombatModels";
import { useCombatManager } from "./CombatManager";

const useEventHandler = () => {

    const combat = useCombatManager();
    const { eventQueue } = combat;
    const processEvent = useCallback(() => {
        // console.log(eventQueue)
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;


    }, [])


    useEffect(() => {
        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, []);


}
export default useEventHandler