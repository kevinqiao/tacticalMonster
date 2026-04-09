import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";

import { useReplay } from "../../battle/view/replayContext";
import { useCombatManager } from "../../service/CombatManager";
import { createTurnOrderBarSpriteViewRef } from "../../utils/combatHudRegistry";
import { getReplayPlaybackSpeed } from "../../utils/replayPlaybackSpeed";
import { usePlayGameOver } from "../animation/usePlayGameOver";
import { usePlayTurnBar } from "../animation/usePlayTurnBar";
import { computeTurnBarDimension } from "../view/turnbar/turnBarLayout";

/** 消费 phase 队列并驱动回合条 GSAP；数据来自 CombatManager（含 mapDimension → 回合条布局）。 */
export function usePhaseChangeEventHandler(): void {
    const {
        mode,
        mapDimension,
        phaseChangeEventQueueRef,
        combatHudRef,
    } = useCombatManager();
    const replay = useReplay();

    const playbackSpeed = getReplayPlaybackSpeed(replay);
    const dimension = useMemo(() => computeTurnBarDimension(mapDimension), [mapDimension]);

    const turnOrderBarSpriteRef = useMemo(
        () => createTurnOrderBarSpriteViewRef(combatHudRef),
        [combatHudRef]
    );

    const { playInitTurn, playStartTurn, playStartRound } = usePlayTurnBar({
        dimension,
        turnOrderBarSpriteRef,
        playbackSpeed,
    });
    const { playGameReport } = usePlayGameOver();

    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const initProcessedRef = useRef(false);

    useEffect(() => {
        const processEvent = () => {
            const queue = phaseChangeEventQueueRef.current;
            const timelineActive = timelineRef.current !== null && timelineRef.current.isActive();
            if (queue.length === 0 || timelineActive) return;

            const turn = queue[0];
            if (turn.status === 2) {
                if (turn.phaseChangeEvent.name === "init") {
                    initProcessedRef.current = true;
                }
                queue.shift();
                return;
            }

            if (turn.status !== 0) return;

            turn.status = 1;
            timelineRef.current = gsap.timeline({
                onComplete: () => {
                    timelineRef.current = null;
                },
            });

            const completeImmediately = () => {
                turn.status = 2;
                timelineRef.current?.play();
            };

            switch (turn.phaseChangeEvent.name) {
                case "init":
                    playInitTurn(turn, timelineRef.current);
                    return;
                case "turnStart":
                    playStartTurn(turn, timelineRef.current);
                    return;
                case "turnEnd":
                    completeImmediately();
                    return;
                case "roundEnd":
                    completeImmediately();
                    return;
                case "roundStart":
                    playStartRound(turn, timelineRef.current);
                    return;
                case "gameOver":
                    playGameReport(timelineRef.current);
                    console.log("gameOver:", turn.phaseChangeEvent.data);
                    return;
                default:
                    completeImmediately();
                    return;
            }
        };

        processEvent();
        const intervalId = setInterval(processEvent, 100);
        return () => clearInterval(intervalId);
    }, [
        mode,
        playInitTurn,
        playStartTurn,
        playStartRound,
        phaseChangeEventQueueRef,
        turnOrderBarSpriteRef,
    ]);
}
