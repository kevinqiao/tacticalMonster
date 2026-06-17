/**
 * Block Blast 回放：在内存盘面上重放一条 recorded op 序列（无 Convex）。
 * 与 solitaireSolo solitaireRolloutReplay 同层；落子由 BlockBlastGameEngine 确定性推进。
 */
import {
    BlockBlastGameEngine,
    type ApplyPlaceShapeInput,
} from '@/convex/blockBlast/convex/service/BlockBlastGameEngine';
import type {
    BlockBlastRecordedOp,
    BlockBlastRolloutScript,
} from '@/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes';
import {
    BLOCK_BLAST_DEFAULT_GRID_SIZE,
    BlockBlastGameStatus,
    type BlockBlastGameState,
    inferGridSizeFromGrid,
} from '../types/BlockBlastTypes';

/** 回放专用 gameId（不对应任何持久化局，仅用于 React key/HUD） */
export function replayGameId(seedId: string): string {
    return `bb-replay-${seedId}`;
}

/** 由 seed 确定性构建初始盘面（与服务端 createInitialGame 完全一致） */
export function createRolloutReplayState(seedId: string): BlockBlastGameState {
    const base = BlockBlastGameEngine.createInitialGame(
        replayGameId(seedId),
        seedId,
        BLOCK_BLAST_DEFAULT_GRID_SIZE
    );
    return {
        ...base,
        gridSize: base.gridSize ?? inferGridSizeFromGrid(base.grid),
        nextShapes: base.nextShapes ?? [],
        reportElement: null,
    };
}

function toEngineInput(state: BlockBlastGameState): ApplyPlaceShapeInput {
    return {
        grid: state.grid.map((r) => [...r]),
        gridSize: state.gridSize ?? inferGridSizeFromGrid(state.grid),
        shapes: state.shapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
        nextShapes: state.nextShapes.map((s) => ({ ...s, shape: s.shape.map((r) => [...r]) })),
        score: state.score,
        lines: state.lines,
        moves: state.moves,
        status: state.status,
        seed: state.seed,
        shapeCounter: state.shapeCounter,
    };
}

export type ApplyRecordedOpResult =
    | {
          ok: true;
          /** 应用本 op 后的最终盘面（已消除满行满列） */
          state: BlockBlastGameState;
          /** 落子后、尚未消除时的盘面（供消行动画前展示）；concede 时为 undefined */
          throughGrid?: number[][];
          cleared?: { rows: number[]; cols: number[] };
          conceded?: boolean;
      }
    | { ok: false; reason: string };

/** 在克隆盘面上应用一条 recorded op；返回最终态 + 中间态（消行动画用）。 */
export function applyRecordedOp(
    state: BlockBlastGameState,
    op: BlockBlastRecordedOp
): ApplyRecordedOpResult {
    if (op.op === 'concede') {
        return {
            ok: true,
            state: { ...state, status: BlockBlastGameStatus.CANCELLED },
            conceded: true,
        };
    }

    const shape = state.shapes[op.slot];
    if (!shape) return { ok: false, reason: 'slot_empty' };

    const input = toEngineInput(state);
    const through = BlockBlastGameEngine.applyPlaceShapeThroughPlacement(
        input,
        shape.id,
        op.row,
        op.col
    );
    const full = BlockBlastGameEngine.applyPlaceShape(input, shape.id, op.row, op.col);
    if (!full.ok) return { ok: false, reason: full.error };

    const next: BlockBlastGameState = {
        ...state,
        grid: full.data.grid,
        shapes: full.data.shapes,
        nextShapes: full.data.nextShapes,
        score: full.data.score,
        lines: full.data.lines,
        moves: full.data.moves,
        status: full.data.status,
        shapeCounter: full.data.shapeCounter,
    };

    return {
        ok: true,
        state: next,
        throughGrid: through.ok ? through.data.grid : full.data.grid,
        cleared: full.data.cleared,
    };
}

/** 每步 UI 间隔（ms）：优先用录制 pacing，否则给一个稳定默认值。 */
export function pacingMsForRolloutStep(
    rollout: Pick<BlockBlastRolloutScript, 'ops' | 'replayPacingMs'>,
    stepIndex: number
): number {
    const custom = rollout.replayPacingMs?.[stepIndex];
    if (typeof custom === 'number' && custom > 0) return custom;
    const op = rollout.ops[stepIndex];
    if (!op) return 500;
    if (op.op === 'concede') return 800;
    return 700;
}
