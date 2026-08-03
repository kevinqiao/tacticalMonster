/**
 * 纯函数：将 PhaseChanges 应用到 GameModel，返回新的 GameModel（不可变）
 * 作为 runtimeGame 的 reducer，供 CombatManager / usePhaseChangesHandler3D 使用
 */

import type { GameModel } from "../types/gameTypes";
import type { PhaseChanges } from "../types/gameTypes";
import { mergeSummonedIntoGame } from "./mergeSummonedIntoGame";

/**
 * 根据 PhaseChanges 计算下一个 GameModel
 * - gameInit: 完全替换
 * - summonedCharacters: 合并召唤单位到 team/boss
 * - 其他字段（roundStart/turnStart 等）由 setPhaseChangeEvent 处理 currentRound，不在此修改
 */
export function applyPhaseChangesToGame(
    prev: GameModel,
    phaseChanges: PhaseChanges | null | undefined
): GameModel {
    if (!phaseChanges) return prev;
    if (phaseChanges.gameInit) return phaseChanges.gameInit;
    const summoned = phaseChanges.summonedCharacters;
    if (summoned?.length) {
        return mergeSummonedIntoGame(prev, summoned);
    }
    return prev;
}
