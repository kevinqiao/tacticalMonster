import { useCallback, useEffect, useRef } from "react";
import { useCombatManager } from "./CombatManager";
import { CombatEvent, EVENT_TYPE, Player } from "./model/CombatModels";

const useEventHandler = () => {

    const playersRef = useRef<Player[] | null>(null);
    const combat = useCombatManager();
    const { players, eventQueue } = combat;
    const processEvent = useCallback(() => {
        // console.log(eventQueue)
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (event) {
            // console.log(event)
            switch (event.type) {
                case EVENT_TYPE.TURN_INIT:

                    break;
                case EVENT_TYPE.TURN_ACT:

                    break;
                default:
                    break;
            }
        }

    }, [])
    useEffect(() => {
        playersRef.current = players;
    }, [players])

    useEffect(() => {
        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, []);


}
export default useEventHandler