import { gsap } from "gsap";
import { useCallback } from "react";

import { SCENE_NAME } from "model/Match3Constants";
import { CellItem } from "../../../model/CellItem";
import { GameScene } from "../../../model/SceneModel";
import { useSceneManager } from "../../../service/SceneManager";


const useActAnimate = () => {
    const { scenes } = useSceneManager();
    const swipeSuccess = useCallback(

        (gameId: string, candy: CellItem, target: CellItem, timeline: any) => {
            const gameScenes = scenes?.get(SCENE_NAME.GAME_SCENES);
            const gameScene = gameScenes.find((s: GameScene) => s.gameId === gameId)
            if (!gameScene) return;
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log("swipe complete")
                }
            });

            const candySprite = gameScene.candies?.get(candy.id);
            const targetSprite = gameScene.candies?.get(target.id);
            if (gameScene.cwidth && candySprite && targetSprite) {
                candySprite.column = candy.column;
                candySprite.row = candy.row;
                targetSprite.column = target.column;
                targetSprite.row = target.row;
                const radius = gameScene.cwidth;
                const cx = candy.column * radius + Math.floor(radius / 2);
                const cy = candy.row * radius + Math.floor(radius / 2);
                const tx = target.column * radius + Math.floor(radius / 2);
                const ty = target.row * radius + Math.floor(radius / 2);
                tl.to(
                    candySprite,
                    {
                        x: cx,
                        y: cy,
                        duration: 0.3,
                        ease: 'power2.out',
                    }).to(
                        targetSprite,
                        {
                            x: tx,
                            y: ty,
                            duration: 0.3,
                            ease: 'power2.out',
                        }, "<");

            }
            if (!timeline)
                tl.play();
            else
                timeline.add(tl)
        },
        []
    );
    const swipeFail = useCallback(
        (gameId: string, candyId: number, targetId: number, timeline: any) => {

            const gameScenes = scenes?.get(SCENE_NAME.GAME_SCENES);
            const gameScene = gameScenes.find((s: GameScene) => s.gameId === gameId)
            if (!gameScene) return;
            const tl = gsap.timeline({

            });

            const candySprite = gameScene.candies?.get(candyId);
            const targetSprite = gameScene.candies?.get(targetId);
            if (gameScene.cwidth && candySprite && targetSprite) {
                const cx = candySprite.x;
                const cy = candySprite.y;
                const tx = targetSprite.x;
                const ty = targetSprite.y;
                tl.to(
                    targetSprite,
                    {
                        x: cx,
                        y: cy,
                        duration: 0.4,
                        ease: 'power2.out',
                    }).to(
                        candySprite,
                        {
                            x: tx,
                            y: ty,
                            duration: 0.4,
                            ease: 'power2.out',
                        }, "<")
                tl.to(
                    targetSprite,
                    {
                        x: tx,
                        y: ty,
                        duration: 0.4,
                        ease: 'power2.out',
                    }, ">").to(
                        candySprite,
                        {
                            x: cx,
                            y: cy,
                            duration: 0.4,
                            ease: 'power2.out',
                        }, "<")
            }
            if (!timeline)
                tl.play();
            else
                timeline.add(tl)
        },
        []
    );

    return { swipeSuccess, swipeFail };
};
export default useActAnimate