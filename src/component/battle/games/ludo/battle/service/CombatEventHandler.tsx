import React, { ReactNode, useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import useCountDownAnimate from "../animation/useCountDownAnimate";
import useDiceAnimate from "../animation/useDiceAnimate";
import useDynamicAnimate from "../animation/useDynamicAnimate";
import useSeatAnimate from "../animation/useSeatAnimate";
import useTokenAnimate from "../animation/useTokenAnimate";
import { ACTION_TYPE, CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
const CombatEventHandler = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { user } = useUserManager();
    const { game, eventQueue, boardDimension } = useCombatManager();
    const { playRollStart, playRollDone, playAskRoll } = useDiceAnimate();
    const { playCountStart, playCountStop } = useCountDownAnimate();
    const { playTokenMove, playTokenToSelect, playTokenSelected, playTokenReleased, playTokenAttacked } = useTokenAnimate();
    const { playTeleport } = useDynamicAnimate();
    const { playBotOn, playBotOff } = useSeatAnimate();

    const processEvent = useCallback(() => {

        if (!game) return;
        // console.log("processEvent", game);
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event || event.status === 1) return;
        console.log("event:", event)
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
                case "rollStart":
                    console.log("roll:", data)
                    event.status = 1;
                    playRollStart(data);
                    onComplete();
                    break;
                case "rollDone":
                    console.log("rollDone:", data)
                    event.status = 1;
                    playCountStop();
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
                    } else if (data.type == ACTION_TYPE.ROLL) {
                        playAskRoll(data.seat, onComplete);
                    }
                    break;
                case "move":
                    playCountStop();
                    event.status = 1;
                    playTokenMove({ data, onComplete: () => { onComplete() } });
                    break;
                case "tokenSelected":
                    event.status = 1;
                    playTokenSelected({ data, onComplete: () => { onComplete() } });
                    break;
                case "tokenReleased":
                    playCountStop();
                    event.status = 1;
                    playTokenReleased({ data, onComplete: () => { onComplete() } });
                    break;
                case "turnNext":
                    event.status = 1;
                    game.currentSeat = data.seatNo;
                    onComplete();
                    break;
                case "botOn":
                    // console.log("botOn:", data)
                    event.status = 1;
                    playBotOn(data.seat);
                    onComplete();
                    break;
                case "botOff":
                    console.log("botOff:", data)
                    event.status = 1;
                    playBotOff(data.seat);
                    onComplete();
                    break;
                case "attacked":
                    event.status = 1;
                    playTokenAttacked({ data, onComplete: () => { onComplete() } });
                    break;
                case "teleported":
                    event.status = 1;
                    playTeleport({ data, onComplete: () => { onComplete() } });
                    break;
                default:
                    event.status = 1;
                    console.log("unknown event", event)
                    onComplete();
                    break;
            }

        }

    }, [user, game, eventQueue, boardDimension, playCountStop, playCountStart])


    useEffect(() => {

        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user, processEvent]);

    return <>{children}</>
}
export default CombatEventHandler

