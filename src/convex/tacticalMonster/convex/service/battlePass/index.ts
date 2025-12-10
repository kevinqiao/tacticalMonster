/**
 * Battle Pass 服务导出
 */

// BattlePassIntegration 已迁移到 TournamentProxyService
// 保持向后兼容，重新导出 TournamentProxyService 的方法
import { TournamentProxyService } from "../tournament/tournamentProxyService";

export const BattlePassIntegration = {
    addGameSeasonPoints: TournamentProxyService.addGameSeasonPoints.bind(TournamentProxyService),
    purchasePremiumPass: TournamentProxyService.purchasePremiumPass.bind(TournamentProxyService),
    getBattlePassWithGameData: TournamentProxyService.getBattlePassWithGameData.bind(TournamentProxyService),
};
export * from "./battlePass";
export * from "./battlePassPoints";

