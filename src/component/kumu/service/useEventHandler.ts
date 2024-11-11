import { useCallback, useEffect, useRef } from "react";
import { useCombatManager } from "./CombatManager";
import { CombatAction, CombatEvent, CombatRound, CombatTurn, EVENT_TYPE, Player } from "./model/CombatModels";

const useEventHandler = () => {
    const currentActionRef = useRef<CombatAction | null>(null);
    const currentTurnRef = useRef<CombatTurn | null>(null);
    const currentRoundRef = useRef<CombatRound | null>(null);
    const playersRef = useRef<Player[] | null>(null);
    const combat = useCombatManager();
    const { players, eventQueue, currentAction, currentTurn, currentRound, setCurrentAction, setCurrentTurn } = combat;
    const processEvent = useCallback(() => {
        // console.log(eventQueue)
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (event) {
            // console.log(event)
            switch (event.type) {
                case EVENT_TYPE.TURN_INIT:
                    {
                        const action = currentActionRef.current;
                        // console.log(action)
                        if (action?.status === 2) {
                            console.log(playersRef.current)
                            eventQueue.shift();
                            setCurrentTurn(event.data as CombatTurn);
                        }
                    }
                    break;
                case EVENT_TYPE.TURN_ACT:
                    {
                        const turn = currentTurnRef.current;
                        // console.log(turn)
                        if (turn?.status === 1) {
                            eventQueue.shift();
                            setCurrentAction(event.data as CombatAction);
                        }
                    }
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
        console.log(currentAction)
        currentActionRef.current = currentAction;
    }, [currentAction])
    useEffect(() => {
        console.log(currentTurn)
        currentTurnRef.current = currentTurn;
    }, [currentTurn])
    useEffect(() => {
        console.log(currentRound)
        currentRoundRef.current = currentRound;
    }, [currentRound])
    useEffect(() => {
        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, []);


}
export default useEventHandler