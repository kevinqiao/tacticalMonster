import {
    TournamentHandler,
} from "../common";
import { multiPlayerHandler } from "./multiPlayerHandler";

/**
 * 多人共享比赛锦标赛处理器
 * 特点：
 * 1. 多个玩家共享同一个比赛实例
 * 2. 支持独立锦标赛（一个比赛实例对应一个锦标赛）和共享锦标赛（多个比赛实例对应一个锦标赛）
 * 3. 实时对战和互动
 * 4. 基于对战结果进行排名
 * 5. 支持智能匹配和队列管理，
 * 5. 立即奖励结算
 */
export const multiPlayerSharedMatchHandler: TournamentHandler = {
    ...multiPlayerHandler,




}