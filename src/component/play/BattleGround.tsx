import React, { ReactNode, useCallback, useRef } from "react";
import { SCENE_NAME, SCENE_TYPE } from "../../model/Match3Constants";
import { useSceneManager } from "../../service/SceneManager";

const BattleGround: React.FC<{ children: ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scenes } = useSceneManager();

  const load = useCallback(
    (sceneEle: HTMLDivElement | null) => {
      if (sceneEle && scenes) {
        containerRef.current = sceneEle;
        const scene = {
          app: sceneEle,
          type: SCENE_TYPE.HTML_DIVELEMENT,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        };
        scenes.set(SCENE_NAME.BATTLE_GROUND, scene);
      }
    },
    [scenes]
  );

  return (
    <>
      <div
        ref={load}
        style={{
          position: "relative",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          margin: 0,
          borderRadius: 10,
          backgroundColor: "blue",
        }}
      >
        {children}
      </div>
    </>
  );
};

export default BattleGround;
