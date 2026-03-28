/**
 * 教学关：将引导事件写入 mr_games.tutorialProgress 并触发胜负检查
 */
import type { GameModel, TutorialProgressState } from "../../types/gameTypes";
import type { TutorialGuideNotifyEvent } from "../../utils/tutorialProgressUtils";
import { mergeTutorialProgress } from "../../utils/tutorialProgressUtils";
import { getModeTypeForRuleId } from "../../utils/tournamentModeType";
import { GameRuleConfigService } from "./gameRuleConfigService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GameScoreService } from "./gameScoreService";

function progressEquals(a: TutorialProgressState | undefined, b: TutorialProgressState | undefined): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
        (a.nextGuideStepIndex ?? 0) === (b.nextGuideStepIndex ?? 0) &&
        (a.dynamicGuideSatisfied ?? false) === (b.dynamicGuideSatisfied ?? false)
    );
}

export class TutorialProgressService {
    static async recordEvent(
        gameId: string,
        lifecycleService: GameLifecycleService,
        scoreService: GameScoreService,
        game: GameModel,
        event: TutorialGuideNotifyEvent
    ): Promise<void> {
        const ruleId = game.ruleId;
        if (!ruleId) return;

        const stageRule = GameRuleConfigService.getGameRuleConfig(ruleId);
        if (getModeTypeForRuleId(ruleId) !== "tutorial") return;

        const pedagogy = stageRule.pedagogy;
        const prev = game.tutorialProgress;
        const next = mergeTutorialProgress(pedagogy, prev, event);

        if (progressEquals(prev, next)) return;

        await lifecycleService.save(gameId, {
            tutorialProgress: next,
            lastUpdate: new Date().toISOString(),
        });
        await scoreService.checkAndUpdateGameStatus(gameId);
    }
}
