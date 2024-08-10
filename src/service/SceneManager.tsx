import candy_textures from "model/candy_textures";
import { SCENE_ID, SCENE_NAME } from "model/Match3Constants";
import * as PIXI from "pixi.js";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { loadSvgAsTexture } from "util/Utils";
import { GameScene, SceneModel } from "../model/SceneModel";
interface ISceneContext {
  // load: number; //0-play 1-replay;
  visible: boolean;
  // containerBound: PagePosition | null | undefined;
  textures: { id: number; texture: PIXI.Texture }[];
  avatarTextures: { name: string; texture: PIXI.Texture }[];
  iconTextures: { name: string; texture: PIXI.Texture }[];
  scenes: Map<string, any> | null;
  createScene: (sceneId: number, scene: SceneModel) => void;
  updateScene: (sceneId: number, data: any) => void;
  // disableCloseBtn: () => void;
  // exit: () => void;
}
const SceneContext = createContext<ISceneContext>({
  // load: 0,
  visible: true,
  // containerBound: null,
  textures: [],
  avatarTextures: [],
  iconTextures: [],
  scenes: null,
  createScene: (sceneId: number, scene: SceneModel) => null,
  updateScene: (sceneId: number, data: any) => null,
  // disableCloseBtn: () => null,
  // exit: () => null,
});
interface SceneEvent {
  type: number;
  id: number;
  scene: SceneModel;
}

export const SceneProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(true);
  const scenesRef = useRef<Map<string, any>>(new Map());
  const texturesRef = useRef<{ id: number; texture: PIXI.Texture }[]>([]);
  const avatarTexturesRef = useRef<{ name: string; texture: PIXI.Texture }[]>([]);
  const iconTexturesRef = useRef<{ name: string; texture: PIXI.Texture }[]>([]);
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("tab visible");
        setVisible(true);
      } else {
        console.log("tab invisible");
        setVisible(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  useEffect(() => {
    const loadTextures = async () => {
      const frameSize = 100;
      const tture = await PIXI.Assets.load("/assets/assets_candy.png");
      const all = candy_textures.map((c) => {
        const rect = new PIXI.Rectangle(c.x, c.y, frameSize, frameSize);
        const texture = new PIXI.Texture(tture.baseTexture, rect);
        return { id: c.id, texture };
      });
      texturesRef.current.push(...all);
      setComplete(true);
    };
    scenesRef.current.set(SCENE_NAME.GAME_CONSOLE_SCENES, []);
    loadTextures();
    loadSvgAsTexture("/icons/focus-select-svgrepo-com.svg", (texture: PIXI.Texture) => {
      iconTexturesRef.current.push({ name: "focus", texture });
    });
    return () => {
      if (scenesRef.current) {
        const gameScenes = scenesRef.current.get(SCENE_NAME.GAME_SCENES);
        if (gameScenes) {
          gameScenes.forEach((scene: SceneModel) => {
            (scene.app as PIXI.Application).destroy(true);
          });
        }
      }
    };
  }, []);

  const value = {
    visible,
    // containerBound: pagePosition,
    textures: texturesRef.current,
    avatarTextures: avatarTexturesRef.current,
    iconTextures: iconTexturesRef.current,
    scenes: scenesRef.current,

    createScene: useCallback(
      (sceneId: number, scene: SceneModel) => {
        if (!scenesRef.current) return;
        switch (sceneId) {
          case SCENE_ID.GAME_SCENE:
            {
              const gscene = scene as GameScene;
              let gameScenes: GameScene[] = scenesRef.current.get(SCENE_NAME.GAME_SCENES);
              if (!gameScenes) {
                gameScenes = [];
                scenesRef.current.set(SCENE_NAME.GAME_SCENES, gameScenes);
              }
              const gameScene = gameScenes.find((s) => s.gameId === gscene.gameId);
              if (!gameScene) {
                gameScenes.push(gscene);
              }
            }
            break;
          case SCENE_ID.BATTLE_CONSOLE_SCENE:
            scenesRef.current.set(SCENE_NAME.BATTLE_CONSOLE, scene);
            break;
          default:
            break;
        }
      },
      [scenesRef.current]
    ),
    updateScene: useCallback(
      (sceneId: number, data: any) => {
        if (!scenesRef.current) return;
        switch (sceneId) {
          case SCENE_ID.GAME_SCENE:
            {
              const gameScenes: GameScene[] | undefined = scenesRef.current.get(SCENE_NAME.GAME_SCENES);
              const gameScene = gameScenes?.find((s) => s.gameId === data.gameId);
              if (gameScene) {
                Object.assign(gameScene, data);
              }
            }
            break;

          case SCENE_ID.BATTLE_CONSOLE_SCENE:
            break;

          default:
            break;
        }
      },
      [scenesRef.current]
    ),
  };

  return <>{complete ? <SceneContext.Provider value={value}> {children} </SceneContext.Provider> : null}</>;
};
export const useSceneManager = () => {
  return useContext(SceneContext);
};
export default SceneProvider;
