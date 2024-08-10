import { gsap } from "gsap";
import { GAME_GOAL } from "model/Match3Constants";
import * as PIXI from "pixi.js";
import { useCallback, useEffect, useRef } from "react";
import { useBattleManager } from "service/BattleManager";
import { useGameManager } from "service/GameManager";
import { CellItem } from "../../../model/CellItem";
import { SCENE_NAME } from "../../../model/Match3Constants";
import { GameConsoleScene, GameScene } from "../../../model/SceneModel";
import { useSceneManager } from "../../../service/SceneManager";
import * as GameUtils from "../../../util/MatchGameUtils";
const useCollectCandies = () => {
    const prematchedRef = useRef<{ asset: number; quantity: number }[]>([])
    const { battle } = useBattleManager();
    const { game } = useGameManager();
    const { scenes, textures } = useSceneManager();

    useEffect(() => {
        if (game?.data.matched) {
            prematchedRef.current = JSON.parse(JSON.stringify(game.data.matched));
        }

    }, [game])
    const getGoalTarget = (gameId: string, asset: number) => {
        if (!scenes) return;
        const ground = scenes.get(SCENE_NAME.BATTLE_GROUND);
        const gameConsoleScenes = scenes?.get(SCENE_NAME.GAME_CONSOLE_SCENES);
        const gameConsoleScene = gameConsoleScenes.find((s: GameConsoleScene) => s.gameId === gameId);
        console.log(gameConsoleScene)
        if (ground && gameConsoleScene?.goals) {

            const goal = gameConsoleScene.goals.find((g: any) => g.asset === asset);
            if (goal?.iconEle) {
                const goalBound = (goal.iconEle as HTMLElement).getBoundingClientRect();
                const groundBound = (ground.app as HTMLDivElement).getBoundingClientRect();
                if (goalBound && groundBound) {
                    const x = goalBound.left - groundBound.left;
                    const y = goalBound.top - groundBound.top;
                    return { x, y }
                }
            }

        }
        return null;

    }

    const playCollect = useCallback((gameId: string, cells: CellItem[], timeline: any) => {
        const matched: { asset: number; quantity: number }[] = JSON.parse(JSON.stringify(prematchedRef.current));
        cells.forEach((r: CellItem) => {
            const ma = matched.find((m) => m.asset === r.asset || m.asset === r.src);
            if (ma)
                ma.quantity++;
            else
                matched.push({ asset: r.asset, quantity: 1 });
        })
        const from = GameUtils.countBaseScore(prematchedRef.current);
        const to = GameUtils.countBaseScore(matched);
        const tl = timeline ?? gsap.timeline();
        const sl = gsap.timeline();
        tl.add(sl);
        if (from !== to)
            playChangeScore(gameId, { from, to }, sl);
        const gl = gsap.timeline();
        playGoalCollect(gameId, cells, gl);
        prematchedRef.current = matched;
        tl.add(gl, "<");
        if (!timeline)
            tl.play();
    }, [])

    const playChangeScore = useCallback((gameId: string, score: { from: number; to: number }, timeline: any) => {
        if (!scenes) return;
        const gameConsoleScenes = scenes?.get(SCENE_NAME.GAME_CONSOLE_SCENES);
        const gameConsoleScene = gameConsoleScenes.find((s: GameConsoleScene) => s.gameId === gameId);
        if (!gameConsoleScene) return;

        const tl = timeline ?? gsap.timeline();
        const sl = gsap.timeline();
        tl.add(sl, "<");
        sl.from(gameConsoleScene.bar, {
            duration: 0.7, onUpdate: () => {
                const progress = sl.progress();
                const animatedValue = progress * (score.to - score.from) + score.from;
                if (gameConsoleScene.score)
                    gameConsoleScene.score.innerHTML = Math.floor(animatedValue) + "";
            }
        }, "<");

        if (gameConsoleScene.plus) {
            const span = document.createElement('span');
            gameConsoleScene.plus.appendChild(span)
            const pl = gsap.timeline({
                onComplete: () => {
                    if (gameConsoleScene.plus) {
                        gameConsoleScene.plus?.removeChild(span)
                    }
                }
            });
            tl.add(pl, "<");

            span.innerHTML = "+" + (score.to - score.from)
            pl.to(span, { autoAlpha: 1, duration: 0 }, "<");
            pl.to(span, { y: -30, duration: 0.8 }, ">");
            pl.to(span, { autoAlpha: 0, y: -60, duration: 0.8 }, ">");
            pl.to(span, { y: 0, duration: 0 }, ">");
        }

    }, [game, battle])

    const playGoalCollect = useCallback((gameId: string, removes: CellItem[], timeline: any) => {
        console.log("play goal collect ")
        if (!scenes) return;
        // console.log(removes)
        const gameScenes = scenes?.get(SCENE_NAME.GAME_SCENES);
        const gameScene = gameScenes.find((s: GameScene) => s.gameId === gameId)

        const cwidth = gameScene?.cwidth;
        if (battle && gameScene && textures && cwidth) {
            const { goal: goalId } = battle.data;
            const goalObj = GAME_GOAL.find((g) => g.id === goalId);
            if (goalObj) {
                const goalChanges: { asset: number; from: number; to: number }[] = [];
                const mt = gsap.timeline();
                removes.forEach((r, index) => {
                    const goal = goalObj.goal.find((a) => a.asset === r.asset);
                    if (goal) {
                        let matched = prematchedRef.current.find((c) => c.asset === r.asset);
                        if (!matched)
                            matched = { asset: r.asset ?? r.src, quantity: 0 }
                        if (matched.quantity < goal.quantity) {
                            const change = goalChanges.find((a) => a.asset === r.asset);
                            change ? change.to-- :
                                goalChanges.push({ asset: goal.asset, from: goal.quantity - matched.quantity, to: goal.quantity - matched.quantity - 1 });
                            playGoalMove(gameId, r, mt)
                        }
                    }
                })
                if (goalChanges.length > 0) {
                    timeline.add(mt)
                    const gt = gsap.timeline();
                    playChangeGoal(gameId, goalChanges, gt)
                    timeline.add(gt, ">");
                }
            }
        }

    }, [battle])
    const playGoalMove = useCallback((gameId: string, candy: CellItem, tl: any) => {
        console.log("play goal move...")
        if (!scenes) return;
        const gameScenes = scenes?.get(SCENE_NAME.GAME_SCENES);
        const gameScene = gameScenes.find((s: GameScene) => s.gameId === gameId);
        const battleScene = scenes.get(SCENE_NAME.BATTLE_SCENE)
        const target = getGoalTarget(gameId, candy.asset);
        console.log(target)
        const cwidth = gameScene?.cwidth;
        const texture = textures?.find((d) => d.id === candy.asset || d.id === candy.src);
        if (battleScene && gameScene && texture && target) {
            const cl = gsap.timeline();
            tl.add(cl, "<");
            const sprite = new PIXI.Sprite(texture.texture);
            sprite.anchor.set(0.5);
            sprite.width = cwidth;
            sprite.height = cwidth;
            const x = gameScene.x + candy.column * cwidth + Math.floor(cwidth / 2);
            const y = gameScene.y + cwidth * candy.row + Math.floor(cwidth / 2);
            sprite.x = x;
            sprite.y = y;
            sprite.alpha = 0;
            const controlPoint = { x: x + 20, y: y - cwidth };
            (battleScene.app as PIXI.Application).stage.addChild(sprite as PIXI.DisplayObject);
            // const target = { x: battleScene.x + 100, y: 100 }
            cl.to(sprite, {
                alpha: 1,
                x: controlPoint.x,
                y: controlPoint.y,
                duration: 2,
                ease: 'circ.out',
            })

            cl.to(sprite, {
                x: target.x,
                y: target.y,
                duration: 0.9,
                ease: 'circ.in',

            }, ">").to(sprite.scale, { duration: 0.9, x: 0, y: 0, ease: 'circ.in' }, "<");

        }
        return;
    }, [scenes])

    const playChangeGoal = useCallback(
        (gameId: string, goalChanges: { asset: number; from: number; to: number }[], timeline: any) => {
            if (!scenes) return;
            const gameConsoleScenes = scenes?.get(SCENE_NAME.GAME_CONSOLE_SCENES);
            const gameConsoleScene = gameConsoleScenes.find((s: GameConsoleScene) => s.gameId === gameId);

            if (gameConsoleScene) {
                const tl = timeline ?? gsap.timeline();

                for (const item of goalChanges) {
                    // if (item.from <= 0) continue;
                    const et = gsap.timeline();
                    tl.add(et, "<")
                    const m = gameConsoleScene.goals.find((g: any) => g.asset === item.asset);
                    if (m?.qtyEle) {
                        et.to(m.qtyEle, {
                            duration: 0.7, onUpdate: () => {
                                const progress = et.progress();
                                const animatedValue = item.from - progress * (item.from - item.to);
                                if (m.qtyEle)
                                    m.qtyEle.innerHTML = animatedValue <= 0 ? "✔️" : Math.floor(animatedValue) + "";
                            }
                        }, "<");

                    }
                }
                if (!timeline)
                    tl.play();
            }
        },
        [scenes]
    );
    return { playCollect }


}
export default useCollectCandies