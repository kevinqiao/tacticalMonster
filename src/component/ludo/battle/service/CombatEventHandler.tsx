import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import useCountDownAnimate from "../animation/useCountDownAnimate";
import useDiceAnimate from "../animation/useDiceAnimate";
import useTokenAnimate from "../animation/useTokenAnimate";
import { ACTION_TYPE, CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";

const CombatEventHandler = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { game, eventQueue, boardDimension } = useCombatManager();
    const { playRollStart, playRollDone } = useDiceAnimate();
    const { playCountStart, playCountStop } = useCountDownAnimate();
    const { playTokenMove, playTokenToSelect, playTokenSelected, playTokenReleased } = useTokenAnimate();


    const processEvent = useCallback(() => {
        if (!game) return;
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event || event.status === 1) return;
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
                case "rollStart":
                    console.log("roll:", data)
                    event.status = 1;
                    // processRollStart(data, () => onComplete(event.initTime));
                    playCountStop();
                    playRollStart(data);
                    onComplete();
                    break;
                case "rollDone":
                    console.log("rollDone:", data)
                    event.status = 1;
                    playRollDone({ data, onComplete: () => { onComplete() } });
                    break;
                case "askAct":
                    event.status = 1;
                    game.currentAction = data;
                    console.log("askAct:", data)
                    game.actDue = data.duration + Date.now();
                    playCountStart();
                    if (data.type == ACTION_TYPE.SELECT) {
                        playTokenToSelect({ data, onComplete: () => { onComplete() } });
                    } else
                        onComplete();
                    break;
                case "move":
                    event.status = 1;
                    console.log("move:", data)
                    playCountStop();
                    playTokenMove({ data, onComplete: () => { onComplete() } });
                    break;
                case "tokenSelected":
                    event.status = 1;
                    console.log("tokenSelected:", data)
                    playTokenSelected({ data, onComplete: () => { onComplete() } });
                    break;
                case "tokenReleased":
                    event.status = 1;
                    console.log("tokenReleased:", data)
                    playTokenReleased({ data, onComplete: () => { onComplete() } });
                    break;
                case "turnNext":
                    console.log("turnNext:", data)
                    event.status = 1;
                    game.currentAction = data;
                    game.actDue = data.duration + Date.now();
                    playCountStart();
                    onComplete();
                    break;
                default:
                    console.log("unknown event", event)
                    eventQueue.shift();
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

