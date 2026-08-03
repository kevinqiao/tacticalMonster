/**
 * Block Blast 观战/复盘：把「rollout（bot）」或「recorded（真人录制）」统一解析为 rollout script。
 * 与 solitaireSolo solitaireWatchReplay 同层。
 */
import { simulateRollout } from '@/convex/blockBlast/convex/service/seedPool/blockBlastSeedSimulator';
import type {
    BlockBlastRecordedStep,
    BlockBlastRolloutScript,
} from '@/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes';
import {
    BLOCK_BLAST_POLICY_VERSION,
    toBlockBlastRecordedOp,
} from '@/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes';

import { applyRecordedOp, createRolloutReplayState, pacingMsForRolloutStep } from './blockBlastRolloutReplay';

export type BlockBlastWatchStepSource =
    | { kind: 'rollout'; seedId: string; rolloutIndex: number }
    | { kind: 'recorded'; seedId: string; steps: BlockBlastRecordedStep[] };

export function resolveWatchRollout(source: BlockBlastWatchStepSource): {
    seedId: string;
    rollout: BlockBlastRolloutScript;
} {
    if (source.kind === 'rollout') {
        return {
            seedId: source.seedId,
            rollout: simulateRollout(source.seedId, source.rolloutIndex),
        };
    }
    const ops = source.steps.map(toBlockBlastRecordedOp);
    const replayPacingMs = source.steps.map((s) =>
        s.pacingMs != null && s.pacingMs > 0 ? s.pacingMs : 600
    );
    return {
        seedId: source.seedId,
        rollout: {
            rolloutIndex: 0,
            policyVersion: BLOCK_BLAST_POLICY_VERSION,
            ops,
            replayPacingMs,
            finalScore: 0,
            moves: 0,
            completed: false,
            terminalReason: 'exited',
            elapsedSimSeconds: 0,
        },
    };
}

export function pacingMsForWatchStep(rollout: BlockBlastRolloutScript, stepIndex: number): number {
    return pacingMsForRolloutStep(rollout, stepIndex);
}

export function estimateStepIndexForBotProgress(args: {
    rollout: BlockBlastRolloutScript;
    revealAt?: number;
    duration?: number;
    nowMs?: number;
}): number {
    const { rollout, revealAt, duration, nowMs = Date.now() } = args;
    const steps = rollout.ops.length;
    if (steps === 0) return 0;
    if (revealAt == null || duration == null || duration <= 0) return 0;
    const progress = Math.min(1, Math.max(0, (nowMs - revealAt) / duration));
    return Math.min(steps, Math.floor(progress * steps));
}

export { applyRecordedOp, createRolloutReplayState };
