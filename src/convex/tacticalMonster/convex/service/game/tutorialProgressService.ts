/**
 * 教学关：将引导事件写入 mr_games.tutorialProgress 并触发胜负检查
 */
import { GameModel, TutorialProgressState, getMrGameStageMode } from "../../types/gameTypes";
import type { TutorialGuideNotifyEvent } from "../../utils/tutorialProgressUtils";
import { mergeTutorialProgress } from "../../utils/tutorialProgressUtils";
import { getModeTypeForRuleId } from "../../utils/tournamentModeType";
import { GameRuleConfigService } from "./gameRuleConfigService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GameScoreService } from "./gameScoreService";

function boolArraysEqual(x?: boolean[], y?: boolean[]): boolean {
    const lx = x?.length ?? 0;
    const ly = y?.length ?? 0;
    if (lx === 0 && ly === 0) return true;
    if (lx !== ly || !x || !y) return false;
    return x.every((v, i) => v === y[i]);
}

function progressEquals(a: TutorialProgressState | undefined, b: TutorialProgressState | undefined): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
        (a.nextGuideStepIndex ?? 0) === (b.nextGuideStepIndex ?? 0) &&
        (a.dynamicGuideSatisfied ?? false) === (b.dynamicGuideSatisfied ?? false) &&
        boolArraysEqual(a.dynamicAllProgress, b.dynamicAllProgress)
    );
}

export class TutorialProgressService {
    /**
     * @param options.skipCheckGameStatus 为 true 时只写入 tutorialProgress，不调用 checkAndUpdateGameStatus。
     * 用于 useSkill / advanceTurnAndRound 等「先推进回合与 Boss AI、再在末尾统一结算」的路径，避免提前判终局导致 Boss attack 校验失败。
     */
    static async recordEvent(
        gameId: string,
        lifecycleService: GameLifecycleService,
        scoreService: GameScoreService,
        game: GameModel,
        event: TutorialGuideNotifyEvent,
        options?: { skipCheckGameStatus?: boolean }
    ): Promise<void> {
        const ruleId = game.ruleId;
        if (!ruleId) return;

        const stageRule = GameRuleConfigService.getGameRuleConfig(ruleId);
        const modeType = getModeTypeForRuleId(ruleId) ?? getMrGameStageMode(game);
        if (modeType !== "tutorial") return;

        const pedagogy = stageRule.pedagogy;
        const prev = game.tutorialProgress;
        const next = mergeTutorialProgress(pedagogy, prev, event);

        if (progressEquals(prev, next)) return;

        await lifecycleService.save(gameId, {
            tutorialProgress: next,
            lastUpdate: new Date().toISOString(),
        });
        if (!options?.skipCheckGameStatus) {
            await scoreService.checkAndUpdateGameStatus(gameId);
        }
    }
}
