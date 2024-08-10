import { gsap } from "gsap";
import { SCENE_NAME } from "model/Match3Constants";
import { useCallback } from "react";
import { GameScene } from "../../../model/SceneModel";
import { useSceneManager } from "../../../service/SceneManager";
import { CandySprite } from "../../pixi/CandySprite";


const useInitGame = () => {
    const { scenes } = useSceneManager();
    const play = useCallback(
        (gameId: string, timeline: any) => {
            if (!scenes) return;
            const gameScenes: GameScene[] = Array.from(scenes.get(SCENE_NAME.GAME_SCENES).values());
            const gameScene: GameScene | undefined = gameScenes.find((g: GameScene) => g.gameId === gameId)


            const tl = timeline ?? gsap.timeline();

            if (gameScene && gameScene.candies && gameScene.column && gameScene.row) {

                const candies: CandySprite[] = Array.from(gameScene.candies.values());
                for (let row = 0; row < gameScene.row; row++) {

                    const rowTL = gsap.timeline();
                    tl.add(rowTL, "<");
                    const len = Math.floor(gameScene.column / 2);
                    for (let column = 0; column < len; column++) {
                        const candy1 = candies.find((c) => c.row === row && c.column === column);
                        const col = gameScene.column - column - 1;
                        const candy2 = candies.find((c) => c.row === row && c.column === col);

                        if (candy1 && candy2) {
                            rowTL.from(candy1.scale, { x: 0, y: 0, duration: 0.8, ease: "power4.out" }, "<+=0.1");
                            rowTL.to(candy1, { alpha: 1, duration: 0.8, ease: "power4.out" }, "<");
                            rowTL.from(candy2.scale, { x: 0, y: 0, duration: 0.8, ease: "power4.out" }, "<");
                            rowTL.to(candy2, { alpha: 1, duration: 0.8, ease: "power4.out" }, "<");
                        }

                    }
                    if (1 === gameScene.column % 2) {
                        const center = candies.find((c) => c.row === row && c.column === len);
                        if (center?.id) {
                            const candy = candies.find((c) => c.id === center.id);
                            if (candy) {
                                rowTL.from(candy.scale, { x: 0, y: 0, duration: 1.2, ease: "power4.out" }, "<+=0.1");
                                rowTL.to(candy, { alpha: 1, duration: 1.2, ease: "power4.out" }, "<");
                            }
                        }
                    }
                }
            }
            if (!timeline) {
                tl.play();
            }
        },
        [scenes]
    );

    return { play };
};
export default useInitGame