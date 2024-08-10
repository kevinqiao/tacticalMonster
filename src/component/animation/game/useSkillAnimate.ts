import { gsap } from "gsap";
import { useCallback } from "react";

import { CandySprite } from "component/pixi/CandySprite";
import { SCENE_NAME } from "model/Match3Constants";
import { useSceneManager } from "../../../service/SceneManager";


const useActAnimate = () => {
    const { scenes } = useSceneManager();
    const swapSuccess = useCallback(
        // (animate: Animate, timeline: any) => {
        (gameId: string, candySprite: CandySprite, targetSprite: CandySprite, timeline: any) => {
            const gameScenes = scenes?.get(SCENE_NAME.GAME_SCENES);
            const gameScene = gameScenes.find((s: any) => s.gameId === gameId);
            if (!gameScene) return;
            const tl = timeline ?? gsap.timeline();

            if (gameScene.cwidth && candySprite && targetSprite) {
                [candySprite.row, targetSprite.row] = [targetSprite.row, candySprite.row];
                [candySprite.column, targetSprite.column] = [targetSprite.column, candySprite.column];
                const cwidth = gameScene.cwidth;
                const cx = candySprite.column * cwidth + Math.floor(cwidth / 2);
                const cy = candySprite.row * cwidth + Math.floor(cwidth / 2);
                const tx = targetSprite.column * cwidth + Math.floor(cwidth / 2);
                const ty = targetSprite.row * cwidth + Math.floor(cwidth / 2);
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
        },
        []
    );

    return { swapSuccess };
};
export default useActAnimate