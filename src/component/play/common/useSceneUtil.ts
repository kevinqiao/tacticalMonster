import { CandySprite } from "component/pixi/CandySprite";
import { CellItem } from "model/CellItem";
import { BATTLE_LOAD } from "model/Constants";
import { SCENE_ID, SCENE_NAME } from "model/Match3Constants";
import { GameScene } from "model/SceneModel";
import * as PIXI from "pixi.js";
import { useCallback, useRef } from "react";
import { useBattleManager } from "service/BattleManager";
import { useGameManager } from "service/GameManager";
import { useSceneManager } from "service/SceneManager";
import { useUserManager } from "service/UserManager";
import { getGameBound } from "util/BattleBoundUtil";

const useSceneUtil = () => {
    const { user } = useUserManager();
    const { scenes, createScene, updateScene } = useSceneManager();
    const { load, battle, containerBound } = useBattleManager();
    const { game } = useGameManager();
    const containerBoundInitialRef = useRef(containerBound)

    const initGameScene = useCallback(
        () => {

            if (!game || !battle || !battle.games || !containerBoundInitialRef.current || !scenes) return;
            const { column, row } = battle.data;
            const { width, height } = containerBoundInitialRef.current;
            const gameScenes: GameScene[] | null | undefined = scenes.get(SCENE_NAME.GAME_SCENES);
            const mode =
                battle.games?.length === 1 || load === BATTLE_LOAD.REPLAY
                    ? 0
                    : game.uid === user.uid
                        ? 1
                        : 2;

            const gameScene: GameScene | undefined = gameScenes?.find((s) => s.gameId === game.gameId);
            if (!gameScene) {
                const gameBound = getGameBound(width, height, column, row, mode);
                if (gameBound) {
                    const app = new PIXI.Application({
                        width: gameBound.width,
                        height: gameBound.height,
                        backgroundAlpha: 0,
                    });
                    const candies = new Map<number, CandySprite>();
                    const scene = {
                        gameId: game.gameId,
                        x: gameBound.left,
                        y: gameBound.top,
                        app,
                        width: gameBound.width,
                        height: gameBound.height,
                        cwidth: gameBound.radius,
                        cheight: gameBound.radius,
                        candies,
                        column: battle.data.column,
                        row: battle.data.row,
                        mode,
                    };
                    createScene(SCENE_ID.GAME_SCENE, scene)
                }
            }
        },
        [battle, game, scenes, load]
    )

    const updateGameScene = useCallback(
        (bound: { top: number; left: number; width: number; height: number; radius: number }) => {
            if (!game || !battle || !scenes) return;
            const gameScenes: GameScene[] | null | undefined = scenes.get(SCENE_NAME.GAME_SCENES);
            const gameScene: GameScene | undefined = gameScenes?.find((s) => s.gameId === game.gameId);
            if (!gameScene) return;
            const data = { gameId: game.gameId, x: bound.left, y: bound.top, width: bound.width, height: bound.height, cwidth: bound.radius, cheight: bound.radius }

            const scene = gameScene.app as PIXI.Application;
            scene.renderer.resize(bound.width, bound.height);
            if (game.data.cells && gameScene.candies.size > 0) {
                const { radius } = bound;
                const candies: CandySprite[] = Array.from(gameScene.candies.values());
                candies.forEach((candy: CandySprite, index: number) => {
                    const cell = game.data.cells.find((cell: CellItem) => cell.id === candy.id);
                    if (!cell) {
                        gameScene.candies.delete(candy.id);
                        candy.parent.removeChild(candy as PIXI.DisplayObject)
                        candy.destroy()
                    } else {
                        candy.width = radius;
                        candy.height = radius;
                        candy.x = cell.column * radius + Math.floor(radius / 2);
                        candy.y = cell.row * radius + Math.floor(radius / 2);
                    }
                })
            }
            updateScene(SCENE_ID.GAME_SCENE, data)
        },
        [battle, game, scenes, load]
    )
    return { initGameScene, updateGameScene }
}
export default useSceneUtil