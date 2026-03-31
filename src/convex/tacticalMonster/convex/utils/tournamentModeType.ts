import {
    getTournamentConfig,
    getTournamentConfigByRuleId,
    resolveTournamentModeType,
} from "../../../tournament/convex/data/tournamentConfigs";
import type { StageModeType } from "../types/stageRuleTypes";

/**
 * 关卡进度类型（教学 / 单人挑战 / 多人赛）以锦标赛 TournamentConfig.modeType 为源（兼容旧 matchRules.modeType）。
 * 先按 typeId 查；若无（typeId 与 ruleId 不一致时），再按 matchRules.ruleId 回退。
 */
export function getModeTypeForRuleId(ruleId: string | undefined | null): StageModeType | undefined {
    if (!ruleId) return undefined;
    let cfg = getTournamentConfig(ruleId);
    if (!cfg || cfg.gameType !== "tacticalMonster" || !cfg.matchRules) {
        cfg = getTournamentConfigByRuleId(ruleId);
    }
    if (cfg?.gameType !== "tacticalMonster" || !cfg.matchRules) return undefined;
    return resolveTournamentModeType(cfg) as StageModeType | undefined;
}
