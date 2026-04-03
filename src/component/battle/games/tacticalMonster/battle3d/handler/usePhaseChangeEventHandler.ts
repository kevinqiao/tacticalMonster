import gsap from "gsap";
import { useEffect, useRef } from "react";

import type { GameMode, TurnOrderBarSprite } from "../../types/CombatTypes";
import type { QueueableTurnBarEventName, TurnBarPhaseEvent, TurnBarQueuedEvent } from "../../utils/turnBarQueueUtils";
import { usePlayTurnBar } from "../animation/usePlayTurnBar";
import type { TurnBarDimension } from "../view/turnbar/turnBarLayout";

export type UsePhaseChangeEventHandlerOptions = {
    dimension: TurnBarDimension | null;
    turnOrderBarSpriteRef: React.MutableRefObject<TurnOrderBarSprite | null>;
    playbackSpeed?: number;
    phaseChangeEventQueueRef: React.MutableRefObject<TurnBarQueuedEvent[]>;
    initQueuedGameKeyRef: React.MutableRefObject<string | null>;
    mode?: GameMode;
};

const REQUIRES_LAYOUT_EVENT_NAMES: QueueableTurnBarEventName[] = ["turnStart", "roundStart"];

function headRequiresLayout(evt: TurnBarPhaseEvent | undefined): boolean {
    return Boolean(evt && (REQUIRES_LAYOUT_EVENT_NAMES as string[]).includes(evt.name));
}

export function usePhaseChangeEventHandler({
    dimension,
    turnOrderBarSpriteRef,
    playbackSpeed = 1,
    phaseChangeEventQueueRef,
    initQueuedGameKeyRef,
    mode,
}: UsePhaseChangeEventHandlerOptions): void {
    const { playInitTurn, playStartTurn, playStartRound } = usePlayTurnBar({
        dimension,
        turnOrderBarSpriteRef,
        playbackSpeed,
    });

    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const initProcessedRef = useRef(false);

    useEffect(() => {
        const processEvent = () => {
            const queue = phaseChangeEventQueueRef.current;
            const timelineActive = timelineRef.current !== null && timelineRef.current.isActive();
            if (queue.length === 0 || timelineActive) return;

            const turn = queue[0];
            if (
                turn.status === 0 &&
                headRequiresLayout(turn.phaseChangeEvent) &&
                initQueuedGameKeyRef.current === null
            ) {
                return;
            }
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
        initQueuedGameKeyRef,
    ]);
}
