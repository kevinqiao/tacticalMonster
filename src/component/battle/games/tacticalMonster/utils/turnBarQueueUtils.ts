/**
 * TurnBar 队列类型与工具 - 供 CombatManager 与 TurnOrderBar 共享
 */

export type TurnBarPhaseEvent = { name: string; data: any };
export type TurnBarQueuedEvent = { status: number; phaseChangeEvent: TurnBarPhaseEvent };
export type QueueableTurnBarEventName = "init" | "turnStart" | "turnEnd" | "roundEnd" | "roundStart";

export const QUEUEABLE_EVENT_NAMES: QueueableTurnBarEventName[] = [
    "init",
    "turnStart",
    "turnEnd",
    "roundEnd",
    "roundStart",
];

export function getPhaseEventKey(evt: { name: string; data: any } | null | undefined): string {
    if (!evt) return "";
    const data = evt.data ?? {};
    if (evt.name === "turnStart") {
        const turn = data.turn ?? data;
        const roundNo = data.currentRound?.no ?? "";
        const actorId = turn?.character_id ?? data.character_id ?? "";
        const order = turn?.order ?? "";
        return `${evt.name}:${roundNo}:${actorId}:${order}`;
    }
    if (evt.name === "roundStart") {
        const roundNo = data.round?.no ?? data.round ?? "";
        return `${evt.name}:${roundNo}`;
    }
    if (evt.name === "init") {
        const roundNo = data?.no ?? "";
        return `${evt.name}:${roundNo}`;
    }
    return `${evt.name}`;
}

export function isQueueableTurnBarEvent(
    evt: TurnBarPhaseEvent | null | undefined
): evt is TurnBarPhaseEvent {
    if (!evt) return false;
    return (QUEUEABLE_EVENT_NAMES as string[]).includes(evt.name);
}

export function enqueueIfNotDuplicate(
    queue: TurnBarQueuedEvent[],
    phaseChangeEvent: TurnBarPhaseEvent
): void {
    const nextKey = getPhaseEventKey(phaseChangeEvent);
    const last = queue[queue.length - 1];
    const lastKey = getPhaseEventKey(last?.phaseChangeEvent);
    if (nextKey !== lastKey) {
        queue.push({ status: 0, phaseChangeEvent });
    }
}
