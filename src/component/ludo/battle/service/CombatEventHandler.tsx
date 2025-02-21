import gsap from "gsap";
import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import useCountDownAnimate from "../animation/useCountDownAnimate";
import useDiceAnimate from "../animation/useDiceAnimate";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";

const CombatEventHandler = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { game, eventQueue } = useCombatManager();
    const { playRollStart, playRollDone } = useDiceAnimate();
    const { playCountStart, playCountStop } = useCountDownAnimate();

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
                    const tl = gsap.timeline({
                        onComplete: () => onComplete()
                    });
                    playRollDone({ data });
                    tl.play();
                    break;
                case "askAct":
                    event.status = 1;
                    game.currentAction = data;
                    console.log("askAct:", data)
                    game.actDue = data.duration + Date.now();
                    playCountStart();
                    onComplete();
                    break;
                case "move":
                    event.status = 1;
                    console.log("move:", data)
                    onComplete();
                    break;
                case "turnNext":
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

    }, [user, game, eventQueue])


    useEffect(() => {

        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user, processEvent]);

    return <>{children}</>
}
export default CombatEventHandler

