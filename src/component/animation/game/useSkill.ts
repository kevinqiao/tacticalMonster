import { CandySprite } from "component/pixi/CandySprite";
import { gsap } from "gsap";
import { GAME_ACTION, SCENE_NAME } from "model/Match3Constants";
import * as PIXI from "pixi.js";
import { useCallback, useRef } from "react";
import { useGameManager } from "service/GameManager";
import { useSceneManager } from "../../../service/SceneManager";
import useSkillAnimate from "./useSkillAnimate";

const useSkill = (timelineRef: any) => {

    const focusIconRef = useRef<PIXI.Sprite | null>(null)
    const { iconTextures, scenes } = useSceneManager();
    const { game, doAct } = useGameManager();
    const { swapSuccess } = useSkillAnimate();

    const swapSelect = useCallback(

        (candy: CandySprite) => {
            if (!game || !scenes) return;
            const gameScenes = scenes.get(SCENE_NAME.GAME_SCENES);
            const gameScene = gameScenes.find((s: any) => s.gameId === game.gameId);
            const stage = (gameScene.app as PIXI.Application).stage;
            const texture = iconTextures[0]['texture']
            const focusIcon = new PIXI.Sprite(texture);
            focusIcon.anchor.set(0.5);
            focusIcon.tint = 0xff0000;
            focusIcon.width = gameScene.cwidth;
            focusIcon.height = gameScene.cwidth;
            focusIcon.x = candy.x;
            focusIcon.y = candy.y;
            stage.addChild(focusIcon);
            focusIconRef.current = focusIcon
        },
        [game]
    );
    const resetSkill = useCallback(

        () => {
            if (focusIconRef.current) {
                focusIconRef.current.destroy();
                focusIconRef.current = null;
            }
        },
        []
    );

    const executeSkill = useCallback(
        async (skill: number, data: any) => {
            console.log("execute skill:" + skill)
            switch (skill) {
                case GAME_ACTION.SKILL_HAMMER:
                    doAct(GAME_ACTION.SKILL_HAMMER, { candyId: data.candy.id })
                    break;
                case GAME_ACTION.SKILL_SWAP:
                    {
                        const { candy, target } = data;
                        if (candy && target && game) {
                            // animateStatusRef.current = 2;
                            const timeline = gsap.timeline({
                                onComplete: () => {
                                    timeline.kill();
                                    timelineRef.current = null;
                                    // animateStatusRef.current = 0;
                                }
                            })
                            timelineRef.current = timeline;
                            swapSuccess(game.gameId, candy, target, timeline);
                            timeline.play();
                            await doAct(GAME_ACTION.SKILL_SWAP, { candyId: data.candy.id, targetId: data.target.id })
                        }
                    }
                    break;
                case GAME_ACTION.SKILL_SPRAY:

                    await doAct(GAME_ACTION.SKILL_SPRAY, { candyId: data.candy.id })
                    break;
                default:
                    break;
            }
        },
        [doAct, game]
    );
    return { swapSelect, resetSkill, executeSkill };
};
export default useSkill