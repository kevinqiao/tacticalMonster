import { CandySprite } from "component/pixi/CandySprite";
import { gsap } from "gsap";
import { CellItem } from "model/CellItem";
import { useCallback } from "react";
import { useBattleManager } from "service/BattleManager";
import { useGameManager } from "service/GameManager";
import { hasMatch3 } from "util/MatchGameUtils";

import { GAME_ACTION } from "model/Match3Constants";
import useActAnimate from "./useActAnimate";


const useAct = (timelineRef: any) => {
    // const timelineRef = useRef<any>(null);
    const { battle } = useBattleManager();
    const { game, doAct } = useGameManager();
    const { swipeSuccess, swipeFail } = useActAnimate();

    const swipeAct = useCallback(

        async (candy: CellItem, target: CellItem) => {

            if (!battle || !game) return;
            const { row, column } = battle.data
            const scandy = { ...candy };
            const starget = { ...target };
            [scandy.row, starget.row] = [starget.row, scandy.row];
            [scandy.column, starget.column] = [starget.column, scandy.column];
            const smeshIds = [28, 29, 30, 31];
            const grid: CellItem[][] = Array.from({ length: row }, () => Array(column).fill(null));
            game.data.cells.sort((a: CellItem, b: CellItem) => a.row === b.row ? a.column - b.column : a.row - b.row);
            for (const unit of game.data.cells) {
                let sunit = { ...unit };
                if (unit.id === scandy.id) {
                    sunit = scandy;
                } else if (unit.id === starget.id) {
                    sunit = starget;
                }
                grid[sunit.row][sunit.column] = sunit
            }
            if (hasMatch3(grid) || smeshIds.includes(candy['asset']) || smeshIds.includes(target['asset'])) {

                const timeline = gsap.timeline({
                    onComplete: () => {
                        timeline.kill();
                        timelineRef.current = null;
                    }
                })
                timelineRef.current = timeline;
                swipeSuccess(game.gameId, scandy, starget, timeline);
                timeline.play();

                await doAct(GAME_ACTION.SWIPE_CANDY, { candyId: candy.id, targetId: target.id });

            } else {
                swipeFail(game.gameId, candy.id, target.id, null);
            }
        },
        [battle, game, doAct]
    );
    const hitAct = useCallback(

        async (candy: CandySprite) => {
            if (!battle || !game) return;
            const smeshIds = [28, 29, 30, 31];
            if (smeshIds.includes(candy.asset)) {
                await doAct(GAME_ACTION.SMASH_CANDY, { candyId: candy.id });
            }
        },
        [battle, game, doAct]
    );

    return { swipeAct, hitAct };
};
export default useAct