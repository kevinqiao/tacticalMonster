import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { BlockBlastRolloutScript } from '@/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes';
import { computeBlockBlastStepScoreFromClear } from '@/convex/blockBlast/convex/service/blockBlastScoreModel';

import { PlayEffects } from '../animation/PlayEffects';
import type { GameStateCommitPatch, GridCellRefs } from '../service/GameManager';
import {
    BlockBlastGameStatus,
    GameInteractionPhase,
    inferGridSizeFromGrid,
    type BlockBlastGameState,
} from '../types/BlockBlastTypes';
import {
    applyRecordedOp,
    createRolloutReplayState,
    pacingMsForRolloutStep,
} from './blockBlastRolloutReplay';

/** 落子后稍停，便于看到「放下」再播消除 */
const PLACE_DWELL_MS = 120;

export type UseBlockBlastWatchReplayerOptions = {
    rollout: BlockBlastRolloutScript;
    seedId: string;
    gameState: BlockBlastGameState | null;
    gridCellRefs: RefObject<GridCellRefs | null>;
    commitGameState: (patch?: GameStateCommitPatch) => void;
    setInteractionPhase: (phase: GameInteractionPhase) => void;
    playbackSpeed?: number;
    initialStepIndex?: number;
};

function commitFullState(
    commitGameState: (patch?: GameStateCommitPatch) => void,
    state: BlockBlastGameState
): void {
    commitGameState({
        grid: state.grid,
        gridSize: state.gridSize,
        shapes: state.shapes,
        nextShapes: state.nextShapes,
        score: state.score,
        lines: state.lines,
        moves: state.moves,
        status: state.status,
        shapeCounter: state.shapeCounter,
    });
}

function waitForNextFrames(count = 2): Promise<void> {
    return new Promise((resolve) => {
        let remaining = count;
        const tick = () => {
            remaining -= 1;
            if (remaining <= 0) resolve();
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

function dwellMs(ms: number, speed: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, Math.max(16, ms / speed));
    });
}

export function useBlockBlastWatchReplayer({
    rollout,
    seedId,
    gameState,
    gridCellRefs,
    commitGameState,
    setInteractionPhase,
    playbackSpeed = 1,
    initialStepIndex = 0,
}: UseBlockBlastWatchReplayerOptions) {
    const [playing, setPlaying] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const simStateRef = useRef<BlockBlastGameState | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const gameStateRef = useRef(gameState);
    const commitRef = useRef(commitGameState);
    const setPhaseRef = useRef(setInteractionPhase);
    const gridCellRefsRef = useRef(gridCellRefs);
    gameStateRef.current = gameState;
    commitRef.current = commitGameState;
    setPhaseRef.current = setInteractionPhase;
    gridCellRefsRef.current = gridCellRefs;

    const reset = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        setPlaying(false);
        setStepIndex(0);
        simStateRef.current = createRolloutReplayState(seedId);
        commitFullState(commitRef.current, simStateRef.current);
    }, [seedId]);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        setPlaying(false);
        let sim = createRolloutReplayState(seedId);
        let appliedSteps = 0;
        if (initialStepIndex > 0 && rollout.ops.length > 0) {
            const target = Math.min(initialStepIndex, rollout.ops.length);
            for (let i = 0; i < target; i++) {
                const applied = applyRecordedOp(sim, rollout.ops[i]!);
                if (!applied.ok) break;
                sim = applied.state;
                appliedSteps = i + 1;
            }
            simStateRef.current = sim;
            commitFullState(commitRef.current, sim);
            setStepIndex(appliedSteps);
            return;
        }
        simStateRef.current = sim;
        setStepIndex(0);
        commitFullState(commitRef.current, sim);
    }, [rollout?.rolloutIndex, rollout.ops.length, seedId, initialStepIndex]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const playOneStep = useCallback(async () => {
        if (!rollout || !gameStateRef.current) return false;
        if (!simStateRef.current) {
            simStateRef.current = createRolloutReplayState(seedId);
        }
        const op = rollout.ops[stepIndex];
        if (!op) return false;

        const applied = applyRecordedOp(simStateRef.current, op);
        if (!applied.ok) {
            console.warn('[blockblast replay] step failed', applied.reason, op);
            setPlaying(false);
            return false;
        }
        const next = applied.state;
        simStateRef.current = next;

        if (applied.conceded) {
            commitRef.current({ status: BlockBlastGameStatus.CANCELLED });
            setStepIndex((i) => i + 1);
            return true;
        }

        const cleared = applied.cleared;
        const lineCount = cleared ? cleared.rows.length + cleared.cols.length : 0;
        const shapeMeta = {
            shapes: next.shapes,
            nextShapes: next.nextShapes,
            moves: next.moves,
            status: next.status,
            shapeCounter: next.shapeCounter,
        };

        setPhaseRef.current(GameInteractionPhase.animating);

        if (lineCount > 0 && applied.throughGrid) {
            const gridSize = next.gridSize ?? inferGridSizeFromGrid(next.grid);
            const stepScore = computeBlockBlastStepScoreFromClear(
                cleared!.rows,
                cleared!.cols,
                gridSize
            );
            // 与 live play 一致：先展示落子后、尚未消除的盘面，再播消行动画
            commitRef.current({
                grid: applied.throughGrid,
                ...shapeMeta,
                score: next.score - stepScore,
                lines: next.lines - lineCount,
            });
            await dwellMs(PLACE_DWELL_MS, playbackSpeed);
            await waitForNextFrames(2);
            const matrix = gridCellRefsRef.current.current;
            if (matrix) {
                await new Promise<void>((resolve) => {
                    PlayEffects.clearLines({
                        data: {
                            rows: cleared!.rows,
                            cols: cleared!.cols,
                            gridCellRefs: matrix,
                        },
                        onComplete: () => resolve(),
                    });
                });
            }
            commitRef.current({ grid: next.grid, score: next.score, lines: next.lines });
        } else if (applied.throughGrid) {
            commitRef.current({
                grid: applied.throughGrid,
                ...shapeMeta,
                score: next.score,
                lines: next.lines,
            });
            await dwellMs(PLACE_DWELL_MS, playbackSpeed);
        } else {
            commitFullState(commitRef.current, next);
        }

        setPhaseRef.current(GameInteractionPhase.idle);
        setStepIndex((i) => i + 1);
        return true;
    }, [playbackSpeed, rollout, seedId, stepIndex]);

    const play = useCallback(() => {
        if (!rollout || !gameStateRef.current) return;
        setPlaying(true);
    }, [rollout]);

    const pause = useCallback(() => {
        setPlaying(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    useEffect(() => {
        if (!playing || !rollout) return;
        if (stepIndex >= rollout.ops.length) {
            setPlaying(false);
            return;
        }
        const delay = Math.max(50, pacingMsForRolloutStep(rollout, stepIndex) / playbackSpeed);
        timerRef.current = setTimeout(() => {
            void playOneStep().then((stepOk) => {
                if (!stepOk) setPlaying(false);
            });
        }, delay);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [playing, playOneStep, playbackSpeed, rollout, stepIndex]);

    const stepForward = useCallback(async () => {
        pause();
        await playOneStep();
    }, [pause, playOneStep]);

    return {
        playing,
        stepIndex,
        totalSteps: rollout?.ops.length ?? 0,
        terminalReason: rollout?.terminalReason,
        finalScore: rollout?.finalScore,
        play,
        pause,
        reset,
        stepForward,
        done: rollout != null && stepIndex >= rollout.ops.length,
    };
}
