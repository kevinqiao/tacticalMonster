/**
 * 前端计分 Hook（支持 play, watch, replay 模式）
 */
import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_SCORING_CONFIG_VERSION } from '../../../../../../convex/tacticalMonster/convex/data/scoringConfigs';
import {
    ActionData,
    CharacterSurvivalStats,
    GameResult,
    ScoreResult,
    sharedScoreService
} from '../../../../../../convex/tacticalMonster/convex/service/game/sharedScoreService';

export function useScoreCalculation(
    gameId: string | null,
    game: any,  // GameModel
    events: any[],  // CombatEvent[]
    mode: 'play' | 'watch' | 'replay',
    configVersion?: string
) {
    const [currentConfigVersion, setCurrentConfigVersion] = useState<string>(
        configVersion || game?.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION
    );

    // ✅ 实时计算当前得分（play/watch 模式）
    const currentScore = useMemo(() => {
        if (mode === 'replay') return 0;

        // ✅ Watch 模式：如果后端不存储 score，基于事件实时计算
        if (mode === 'watch' && events.length > 0) {
            const result = sharedScoreService.recalculateScoresForReplay(
                events,
                currentConfigVersion
            );
            return result.totalBaseScore;
        }

        // Play 模式：从游戏状态获取基础得分（后端存储或乐观更新）
        if (game) {
            return game.score || 0;
        }

        return 0;
    }, [game, mode, events, currentConfigVersion]);

    // ✅ 计算每个事件的得分（replay 模式）
    const eventScores = useMemo(() => {
        if (mode !== 'replay' || !events.length) {
            return new Map<string, number>();
        }

        const result = sharedScoreService.recalculateScoresForReplay(
            events,
            currentConfigVersion
        );

        return result.eventScores;
    }, [events, currentConfigVersion, mode]);

    // ✅ 计算累积得分（replay 模式）
    const cumulativeScores = useMemo(() => {
        if (mode !== 'replay' || !events.length) {
            return new Map<string, number>();
        }

        const result = sharedScoreService.recalculateScoresForReplay(
            events,
            currentConfigVersion
        );

        return result.cumulativeScores;
    }, [events, currentConfigVersion, mode]);

    // ✅ 计算行动得分（实时，用于乐观更新）
    const calculateActionScore = useCallback((
        actionData: ActionData
    ): number => {
        return sharedScoreService.calculateActionScore(
            actionData,
            currentConfigVersion
        );
    }, [currentConfigVersion]);

    // ✅ 计算最终得分（游戏结束时）
    const calculateFinalScore = useCallback((
        baseScore: number,
        timeElapsed: number,
        roundsUsed: number,
        gameResult: GameResult,
        survivalStats: CharacterSurvivalStats
    ): ScoreResult => {
        return sharedScoreService.calculateCompleteScore({
            baseScore,
            timeElapsed,
            roundsUsed,
            damageDealt: 0,  // 可选
            skillsUsed: 0,    // 可选
            gameResult,
            survivalStats
        }, currentConfigVersion);
    }, [currentConfigVersion]);

    // ✅ 判断游戏结果
    const checkGameResult = useCallback((): {
        result: GameResult;
        reason: string;
        isGameOver: boolean;
    } => {
        if (!game) {
            return {
                result: GameResult.DRAW,
                reason: '游戏未加载',
                isGameOver: false
            };
        }

        return sharedScoreService.determineGameResult(game, currentConfigVersion);
    }, [game, currentConfigVersion]);

    return {
        currentScore,
        eventScores,
        cumulativeScores,
        currentConfigVersion,
        setCurrentConfigVersion,
        calculateActionScore,
        calculateFinalScore,
        checkGameResult
    };
}

