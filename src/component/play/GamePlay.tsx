import { gsap } from "gsap";
import { BATTLE_LOAD } from "model/Constants";
import { SCENE_NAME } from "model/Match3Constants";
import { GameScene } from "model/SceneModel";
import * as PIXI from "pixi.js";
import React, { useEffect, useMemo, useRef } from "react";
import { useGameManager } from "service/GameManager";
import { useBattleManager } from "../../service/BattleManager";
import { useSceneManager } from "../../service/SceneManager";
import { useUserManager } from "../../service/UserManager";
import SkillControl from "./skill/SkillControl";
import useGameScene from "./useGameScene";

const GamePlay = () => {
  const { game, gameEvent } = useGameManager();
  const maskRef = useRef<HTMLDivElement | null>(null);
  const gameOverRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<HTMLElement | null>(null);
  const goalRef = useRef<HTMLElement | null>(null);
  const timeRef = useRef<HTMLElement | null>(null);
  const { load, battle } = useBattleManager();
  const { scenes } = useSceneManager();
  const { user } = useUserManager();

  const { bound } = useGameScene();

  useEffect(() => {
    if (!bound) return;

    let result;
    if (gameEvent?.name === "gameOver") result = gameEvent.data.result;
    else if (load !== BATTLE_LOAD.REPLAY && game) result = game.result;
    if (result) {
      const { base, goal, time } = result;
      if (baseRef.current) baseRef.current.innerHTML = base + "";
      if (goalRef.current) goalRef.current.innerHTML = goal + "";
      if (timeRef.current) timeRef.current.innerHTML = time + "";
      const tl = gsap.timeline();
      tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.4 });
      tl.to(gameOverRef.current, { autoAlpha: 1, duration: 0.4 }, "<");
      tl.play();
    }
  }, [gameEvent, bound, game, load]);
  useEffect(() => {
    if (!bound || !game || !battle || !scenes || !sceneRef.current || !user) return;
    // console.log("uid:" + game.uid + " gameId:" + game.gameId + " uid:" + user.uid);
    // console.log(bound);
    const gameScenes = scenes?.get(SCENE_NAME.GAME_SCENES);
    const gameScene = gameScenes.find((s: GameScene) => s.gameId === game.gameId);
    if (gameScene) {
      const app: PIXI.Application = gameScene.app as PIXI.Application<PIXI.ICanvas>;
      sceneRef.current.appendChild(app.view as unknown as Node);
    }
  }, [bound, user]);

  const render = useMemo(() => {
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: bound?.top,
            left: bound?.left,
            width: bound?.width,
            height: bound?.height,
            margin: 0,
            border: 0,
            zIndex: game?.uid === user.uid ? 200 : 100,
            filter: game?.uid !== user.uid ? "blur(0px)" : "blur(0px)",
          }}
        >
          <div
            ref={sceneRef}
            style={{ width: "100%", height: "100%", backgroundColor: "transparent", touchAction: "none" }}
          ></div>

          <div
            ref={maskRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              backgroundColor: "black",
              pointerEvents: "none",
            }}
          ></div>
          <div
            ref={gameOverRef}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "transparent",
              pointerEvents: "none",
              opacity: 0,
              color: "white",
            }}
          >
            <div style={{ width: "80%", display: "flex", justifyContent: "center" }}>
              <span style={{ fontSize: 20, color: "white" }}>Game Over</span>
            </div>
            <div style={{ width: "80%", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, color: "white" }}>Base</span>
              <span ref={baseRef} style={{ fontSize: 15, color: "white" }}>
                {100}
              </span>
            </div>
            <div style={{ width: "80%", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, color: "white" }}>Goal</span>
              <span ref={goalRef} style={{ fontSize: 15, color: "white" }}>
                {100}
              </span>
            </div>
            <div style={{ width: "80%", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, color: "white" }}>Time Bonus</span>
              <span ref={timeRef} style={{ fontSize: 15, color: "white" }}>
                {100}
              </span>
            </div>
          </div>
        </div>

        {game?.uid === user.uid ? <SkillControl gameBound={bound} /> : null}
      </>
    );
  }, [game, bound, load]);
  return <>{render}</>;
};

export default GamePlay;
