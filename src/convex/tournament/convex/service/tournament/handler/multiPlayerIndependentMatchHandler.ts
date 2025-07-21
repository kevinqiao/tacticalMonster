import {
    TournamentHandler
} from "../common";
import { multiPlayerHandler } from "./multiPlayerHandler";

/**
 * 多人独立比赛锦标赛处理器
 * 特点：
 * 1. 多个玩家共享同一个锦标赛实例
 * 2. 每个玩家进行独立的单人比赛
 * 3. 根据所有玩家的独立比赛成绩进行排名
 * 4. 支持多次尝试和每场奖励
 */
export const multiPlayerIndependentMatchHandler: TournamentHandler = {
    ...multiPlayerHandler,




};

