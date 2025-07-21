import { TournamentHandler } from "../common";
import { baseHandler } from "./base";

/**
 * 独立锦标赛处理器
 * 处理独立锦标赛类型
 * 特点：每个玩家都有独立的锦标赛实例
 */
export const singlePlayerIndependentTournamentHandler: TournamentHandler = {
    ...baseHandler,


}; 