/**
 * 回合标准化工具 - 纯函数，用于 turnStart/turnEnd 的 currentRound 处理
 * 后端 turnStart.currentRound 在部分场景不会带完整的 completed(2) 轨迹，
 * 前端需保留已知的 completed 状态并正确设置 status 0/1/2
 */

import type { GameRound, GameTurn } from "../types/gameTypes";

export type TurnActor = {
    uid?: string;
    character_id?: string;
    monsterId?: string;
    bossId?: string;
    minionId?: string;
    status?: number;
    order?: number;
};

const getResolvedActorId = (
    actor: TurnActor,
    activeFromRound: string | undefined
): string | undefined =>
    actor.character_id ??
    activeFromRound ??
    actor.monsterId ??
    actor.bossId ??
    actor.minionId;

/**
 * 主路径：有 backendRound 时的完整标准化
 * 后端每次 turnStart 都带 currentRound，直接整体替换以同步 order（含召唤等）
 * 若仍在同一回合，优先保留前端已知的 completed 状态，避免 turnbar 每次「重置」
 */
export function normalizeTurnRound(
    backendRound: GameRound,
    actor: TurnActor,
    prevRound: GameRound | undefined,
    eventName: "turnStart" | "turnEnd"
): GameRound {
    const activeFromRound = backendRound.turns.find((t) => (t.status ?? 0) === 1)?.character_id;
    const resolvedActorId = getResolvedActorId(actor, activeFromRound);

    const keepCompletedFromPrev = prevRound?.no === backendRound.no;
    const prevCompletedIds = new Set<string>(
        keepCompletedFromPrev && prevRound
            ? prevRound.turns
                  .filter((t) => (t.status ?? 0) === 2)
                  .map((t) => t.character_id)
            : []
    );
    if (keepCompletedFromPrev && prevRound) {
        const prevActiveId = prevRound.turns.find((t) => (t.status ?? 0) === 1)?.character_id;
        if (prevActiveId && prevActiveId !== resolvedActorId) {
            prevCompletedIds.add(prevActiveId);
        }
    }

    let matched = false;
    const normalizedTurns: GameTurn[] = backendRound.turns.map((t) => {
        const isActor =
            !!resolvedActorId &&
            t.character_id === resolvedActorId &&
            (!actor.uid || t.uid === actor.uid);
        if (isActor) {
            matched = true;
            return { ...t, status: 1 };
        }
        if (prevCompletedIds.has(t.character_id)) {
            return { ...t, status: 2 };
        }
        if ((t.status ?? 0) === 1 && !!resolvedActorId) {
            return { ...t, status: 0 };
        }
        return { ...t };
    });
    if (!matched && resolvedActorId && actor.uid) {
        normalizedTurns.push({
            uid: actor.uid,
            character_id: resolvedActorId,
            status: 1,
            order: actor.order ?? (normalizedTurns.length + 1),
        });
    }
    return {
        ...backendRound,
        turns: normalizedTurns,
    };
}

/**
 * 兜底路径：无 currentRound 时按单条 turn 更新/追加
 * 后端 turnEnd 常见只带 uid/monsterId，可能无法直接匹配 character_id
 */
export function applySingleTurnUpdate(
    prevRound: GameRound,
    actor: TurnActor,
    eventName: "turnStart" | "turnEnd"
): GameRound {
    const activeFromPrev =
        eventName === "turnEnd"
            ? prevRound.turns.find((t) => (t.status ?? 0) === 1)?.character_id
            : undefined;
    const actorId = getResolvedActorId(actor, activeFromPrev);
    const turns = prevRound.turns;
    let updatedTurns = turns.map((t) => ({ ...t }));
    let turn = actorId ? updatedTurns.find((t) => t.character_id === actorId) : undefined;

    if (eventName === "turnStart") {
        updatedTurns = updatedTurns.map((t) => {
            if ((t.status ?? 0) === 1) return { ...t, status: 0 };
            return t;
        });
        turn = actorId ? updatedTurns.find((t) => t.character_id === actorId) : undefined;
        if (!turn && actorId && actor.uid) {
            updatedTurns.push({
                uid: actor.uid,
                character_id: actorId,
                status: 1,
                order: actor.order ?? (updatedTurns.length + 1),
            });
        } else if (turn) {
            turn.status = 1;
        }
    } else {
        if (turn) {
            turn.status = 2;
        } else {
            const inProgress = updatedTurns.find(
                (t) => (t.status ?? 0) === 1 && (!actor.uid || t.uid === actor.uid)
            );
            if (inProgress) inProgress.status = 2;
        }
    }

    return {
        no: prevRound.no,
        turns: updatedTurns.map((t) => ({ ...t })),
    };
}
