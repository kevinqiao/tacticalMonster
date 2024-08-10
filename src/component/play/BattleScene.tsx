import { SceneModel } from "model/SceneModel";
import * as PIXI from "pixi.js";
import React, { useCallback, useEffect } from "react";
import { useBattleManager } from "service/BattleManager";
import { SCENE_NAME } from "../../model/Match3Constants";
import { useSceneManager } from "../../service/SceneManager";

const BattleScene = () => {
  const { containerBound } = useBattleManager();
  const { scenes } = useSceneManager();

  useEffect(() => {
    if (containerBound && scenes) {
      const { left, top, width, height } = containerBound;
      const battleScene = scenes.get(SCENE_NAME.BATTLE_SCENE) as SceneModel;
      // const b = { top, left, width, height };
      if (battleScene?.app) {
        const scene = battleScene.app as PIXI.Application;
        scene.renderer.resize(width, height);
        battleScene.x = left;
        battleScene.y = top;
        battleScene.width = width;
        battleScene.height = height;
      }
    }
  }, [scenes, containerBound]);
  const load = useCallback(
    (sceneEle: HTMLDivElement | null) => {
      if (containerBound && scenes && sceneEle) {
        let battleScene = scenes.get(SCENE_NAME.BATTLE_SCENE) as SceneModel;
        let app: PIXI.Application<PIXI.ICanvas>;
        if (!battleScene) {
          const { left, top, width, height } = containerBound;
          app = new PIXI.Application({
            width,
            height,
            backgroundAlpha: 0,
          });
          battleScene = {
            x: left,
            y: top,
            app,
            width,
            height,
          };
        } else app = battleScene.app as PIXI.Application<PIXI.ICanvas>;
        sceneEle.appendChild(app.view as unknown as Node);
        scenes.set(SCENE_NAME.BATTLE_SCENE, battleScene);
        // stageScene(SCENE_NAME.BATTLE_SCENE, battleScene);
      }
    },
    [containerBound, scenes]
  );
  return (
    <div
      ref={load}
      style={{
        position: "absolute",
        zIndex: 260,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
        pointerEvents: "none",
      }}
    ></div>
  );
};

export default BattleScene;
