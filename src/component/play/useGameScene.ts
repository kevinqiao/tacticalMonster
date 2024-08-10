import useAct from "component/animation/game/useAct";
import useMatchAnimate from "component/animation/game/useMatchAnimate";
import useSkill from "component/animation/game/useSkill";
import { isGameActEvent, MOVE_DIRECTION, SCENE_NAME } from "model/Match3Constants";
import * as PIXI from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { getGameBound } from "util/BattleBoundUtil";
import { CellItem } from "../../model/CellItem";
import { GameScene } from "../../model/SceneModel";
import { useBattleManager } from "../../service/BattleManager";
import { useGameManager } from "../../service/GameManager";
import { useSceneManager } from "../../service/SceneManager";
import { CandySprite } from "../pixi/CandySprite";
import useSceneUtil from "./common/useSceneUtil";
const useGameScene = () => {
    const timelineRef = useRef<any>(null);
    const { gameEvent, game } = useGameManager();
    const { battle, loadGame, currentSkill, setCurrentSkill, containerBound } = useBattleManager();
    const skillRef = useRef<number>(currentSkill);
    const { textures, scenes } = useSceneManager();
    const { initGameScene, updateGameScene } = useSceneUtil();
    const { playApply } = useMatchAnimate(timelineRef);
    const { swipeAct, hitAct } = useAct(timelineRef);
    const { swapSelect, resetSkill, executeSkill } = useSkill(timelineRef);
    const selectedCandyRef = useRef<CandySprite[]>([]);
    const boundRef = useRef<{
        top: number;
        left: number;
        width: number;
        height: number;
        radius: number;
    } | null>(null)
    const [bound, setBound] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
        radius: number;
    } | null>(null);

    const stopAnimate = useCallback(() => {
        if (timelineRef.current)
            timelineRef.current.kill();
    }, [])

    const createCandySprite = useCallback((cell: CellItem, x: number, y: number): PIXI.Sprite | null => {
        if (!game?.gameId || !scenes) return null;
        const gameScenes = scenes.get(SCENE_NAME.GAME_SCENES);
        const gameScene = gameScenes.find((s: GameScene) => s.gameId === game.gameId);
        const texture = textures?.find((d) => d.id === cell.asset);

        if (texture && gameScene?.app && gameScene.cwidth) {
            const stage = (gameScene.app as PIXI.Application).stage;
            const sprite = new CandySprite(texture.texture, cell.id, cell.asset, cell.column, cell.row)
            sprite.anchor.set(0.5);
            sprite.width = gameScene.cwidth;
            sprite.height = gameScene.cwidth;
            sprite.x = x;
            sprite.y = y;
            sprite.eventMode = 'static';
            // if (load !== Constant.BATTLE_LOAD.REPLAY) {
            //     sprite.on("pointerdown", (event: any) => {
            //         // console.log("pointer down:" + cell.id)
            //         selectedCandyRef.current.push(sprite);
            //     });
            // }
            stage.addChild(sprite as PIXI.DisplayObject);
            return sprite;
        }
        return null;
    }, [game, scenes, textures, battle?.type])

    const init = useCallback((cells: CellItem[]) => {
        if (!game || !game?.gameId || !scenes) return;
        initGameScene();
        const gameScenes = scenes.get(SCENE_NAME.GAME_SCENES);
        const gameScene = gameScenes.find((s: GameScene) => s.gameId === game.gameId);

        if (gameScene && game.gameId && gameScene?.candies && gameScene?.cwidth) {

            const candies: CandySprite[] = Array.from(gameScene.candies.values());
            candies.forEach((candy: CandySprite) => {
                gameScene.candies.delete(candy.id);
                candy.parent.removeChild(candy as PIXI.DisplayObject)
                candy.destroy()
            })
            gameScene.candies.clear();

            const cwidth = gameScene.cwidth;
            cells.forEach((c) => {
                const x = c.column * cwidth + Math.floor(cwidth / 2);
                const y = c.row * cwidth + Math.floor(cwidth / 2);
                const sprite = createCandySprite(c, x, y);
                if (sprite) {
                    sprite.alpha = 1
                    gameScene.candies?.set(c.id, sprite as CandySprite)
                }
            })
            if (!boundRef.current) {
                const b = { top: gameScene.y, left: gameScene.x, width: gameScene.width, height: gameScene.height, radius: gameScene.radius };
                boundRef.current = b;
                setBound(b);
            }
        }
    }, [createCandySprite, game, scenes])

    const handleDrag = useCallback((direction: number) => {
        // console.log("handle drag:" + direction);
        // const candySprite = selectedCandyRef.current;
        if (!game || !battle) return;
        const { column, row } = battle.data;
        const selecteds: CandySprite[] = selectedCandyRef.current;

        if (!skillRef.current && selecteds.length > 0) {
            if (direction > 0) {
                const c = direction === 2 || direction === 4 ? selecteds[0]['column'] : (direction === 1 ? selecteds[0]['column'] + 1 : selecteds[0]['column'] - 1);
                const r = direction === 1 || direction === 3 ? selecteds[0]['row'] : (direction === 2 ? selecteds[0]['row'] + 1 : selecteds[0]['row'] - 1);
                if (c >= 0 && c < column && r >= 0 && r < row) {
                    const candy = game.data.cells.find((cell: CellItem) => selecteds[0].id === cell.id);
                    const target = game.data.cells.find((cell: CellItem) => cell.column === c && cell.row === r)
                    if (candy && target)
                        swipeAct(candy, target)
                }
            } else {
                hitAct(selecteds[0])
            }
            selectedCandyRef.current.length = 0;
        } else {

            switch (skillRef.current) {
                case 1:
                    if (selecteds.length === 1) {
                        executeSkill(1, { candy: selecteds[0] })
                        setCurrentSkill(0)
                    }
                    break;
                case 2:
                    if (selecteds.length === 1) {
                        swapSelect(selecteds[0])
                    } else if (selecteds.length === 2) {
                        executeSkill(2, { candy: selecteds[0], target: selecteds[1] })
                        setCurrentSkill(0)
                    }
                    break;
                case 3:
                    if (selecteds.length === 1) {
                        executeSkill(3, { candy: selecteds[0] })
                        setCurrentSkill(0)
                    }
                    break;
                default:
                    break;
            }
        }
    }, [currentSkill, game, battle])


    useEffect(() => {

        if (!game || !game?.gameId || !scenes) return;
        const gameScenes = scenes.get(SCENE_NAME.GAME_SCENES);
        const gameScene = gameScenes?.find((s: GameScene) => s.gameId === game.gameId);

        if (gameEvent?.name === "initGame") {
            stopAnimate();
            init(gameEvent.data.data.cells)
            loadGame(game.gameId, { matched: game.data.matched ?? [] });
        } else if (gameEvent && isGameActEvent(gameEvent.name)) {
            const data: { results: { toChange: CellItem[]; toCreate: CellItem[]; toMove: CellItem[]; toRemove: CellItem[] }[] } = gameEvent.data;
            if (!data?.results) return
            for (const res of data.results) {
                const cwidth = gameScene.cwidth;
                if (cwidth)
                    res.toCreate.forEach((cell: CellItem) => {
                        const x = cell.column * cwidth + Math.floor(cwidth / 2);
                        // const y = -cwidth * (size - cell.row - 1) - Math.floor(cwidth / 2);
                        const y = - Math.floor(cwidth / 2);
                        const sprite = createCandySprite(cell, x, y);
                        if (sprite)
                            gameScene.candies.set(cell.id, sprite as CandySprite)
                    })
            }
            playApply(gameEvent)
        }

    }, [gameEvent, scenes, init])

    //handle cancel to use skill
    useEffect(() => {

        if (currentSkill === 0 && selectedCandyRef.current.length > 0) {
            selectedCandyRef.current.forEach((c) => c.alpha = 1);
            selectedCandyRef.current.length = 0;
            resetSkill();
        }
        skillRef.current = currentSkill;
    }, [currentSkill])


    useEffect(() => {
        if (scenes && game?.gameId) {
            const gameScenes = scenes.get(SCENE_NAME.GAME_SCENES)
            const gameScene = gameScenes.find((s: GameScene) => s.gameId === game.gameId)
            if (gameScene?.app) {
                const app = gameScene.app as PIXI.Application;
                let startX = 0;
                let startY = 0;
                if (app.view.addEventListener) {
                    app.view.addEventListener('pointerdown', (event) => {
                        if (event instanceof PointerEvent) {
                            startX = event.clientX;
                            startY = event.clientY;
                        }
                    });
                    app.view.addEventListener('pointerup', (event) => {
                        const pevent = event as PointerEvent;
                        const deltaX = pevent.clientX - startX;
                        const deltaY = pevent.clientY - startY;
                        let direction = 0;
                        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10)
                            direction = deltaX > 0 ? MOVE_DIRECTION.RIGHT : MOVE_DIRECTION.LEFT;
                        else if (Math.abs(deltaY) > 10)
                            direction = deltaY > 0 ? MOVE_DIRECTION.DOWN : MOVE_DIRECTION.UP;
                        handleDrag(direction)
                    });
                }
            }
        }
    }, [scenes, game])



    //handle window size change to update candy sprite
    useEffect(() => {
        console.log("update gamescene")
        const gameScenes = scenes?.get(SCENE_NAME.GAME_SCENES);
        if (game && gameScenes && containerBound) {
            const gameScene = gameScenes.find((s: GameScene) => s.gameId === game.gameId);
            if (boundRef.current && gameScene) {
                const { width, height } = containerBound;
                const cbound = getGameBound(width, height, gameScene.column, gameScene.row, gameScene.mode);
                if (cbound) {
                    boundRef.current = cbound;
                    updateGameScene(cbound);
                    setBound(cbound)
                }
            }

        }
    }, [scenes, containerBound, game]);
    return { bound }
}
export default useGameScene


