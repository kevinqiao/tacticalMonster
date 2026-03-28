import { getTournamentConfig } from "../../../tournament/convex/data/tournamentConfigs";
import type { StageModeType } from "../types/stageRuleTypes";

/**
 * 关卡进度类型（教学 / 单人挑战 / 多人赛）以锦标赛 matchRules.modeType 为源。
 */
export function getModeTypeForRuleId(ruleId: string | undefined | null): StageModeType | undefined {
    if (!ruleId) return undefined;
    const cfg = getTournamentConfig(ruleId);
    if (cfg?.gameType !== "tacticalMonster" || !cfg.matchRules) return undefined;
    const mr = cfg.matchRules as { modeType?: StageModeType };
    return mr.modeType;
}
