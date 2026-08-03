import type { ReplayControls } from "../types/CombatTypes";

/** 与 CombatManager 原 playbackSpeed 一致：非重播为 1，重播取 replay.state.playbackSpeed */
export function getReplayPlaybackSpeed(
    replay: ReplayControls | undefined | null
): number {
    return replay?.state.playbackSpeed ?? 1;
}
