import { gsap } from "gsap";
import { BattleConsoleScene, GameConsoleScene } from "model/SceneModel";
import { useCallback } from "react";
import { SCENE_NAME } from "../../../model/Match3Constants";
import { useSceneManager } from "../../../service/SceneManager";

const useInitConsole = () => {
    const { scenes } = useSceneManager();
    const play = useCallback(
        (isPlayer: boolean, gameId: string, score: number, timeline: any) => {
            if (!scenes) return;
            const battleConsole: BattleConsoleScene | undefined = scenes.get(SCENE_NAME.BATTLE_CONSOLE) as BattleConsoleScene
            const gameConsoleScenes: GameConsoleScene[] | undefined = scenes.get(SCENE_NAME.GAME_CONSOLE_SCENES);
            if (!gameConsoleScenes) return;
            const gameConsole: GameConsoleScene | undefined = gameConsoleScenes.find((c) => c.gameId === gameId);
            if (!gameConsole) return;
            const tl = timeline ?? gsap.timeline();

            tl.to(battleConsole.app, {
                alpha: 1,
                duration: 1.0,
            })
            const sl = gsap.timeline();
            tl.add(sl, "<");

            if (gameConsole.bar) {
                const width = gameConsole.bar?.offsetWidth
                sl.from(gameConsole.bar, {
                    width: 0, alpha: 0, x: isPlayer ? 0 : width, duration: 1.0, onUpdate: () => {
                        const progress = sl.progress();
                        const animatedValue = progress * score;
                        if (gameConsole.score)
                            gameConsole.score.innerHTML = Math.floor(animatedValue) + "";
                    }
                }, "<");
            }


            const gl = gsap.timeline();
            tl.add(gl, "<")

            if (gameConsole.goals)
                for (const goal of gameConsole.goals) {
                    if (goal.iconEle)
                        gl.from(goal.iconEle, { alpha: 0, duration: 0.8 }, ">-=0.4");
                }
            if (!timeline)
                tl.play();
        },
        [scenes]
    );


    return { play };
};
export default useInitConsole