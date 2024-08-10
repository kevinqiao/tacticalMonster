import React, { useEffect, useRef } from "react";
import { SCENE_NAME } from "../../model/Match3Constants";
import { useSceneManager } from "../../service/SceneManager";
import useDimension from "../../util/useDimension";

const Loading = () => {
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  const { scenes } = useSceneManager();
  const { width, height } = useDimension(sceneContainerRef);
  useEffect(() => {
    if (scenes && sceneContainerRef.current) {
      const scene = scenes.get(SCENE_NAME.BATTLE_MATCHING);
      if (!scene && width > 0 && height > 0) {
        const scene = {
          app: sceneContainerRef.current,
          x: 0,
          y: 0,
          width: width,
          height: height,
          type: 1,
        };
        scenes.set(SCENE_NAME.BATTLE_LOADING, scene);
      }
    }
  }, [sceneContainerRef, scenes, width, height]);

  return (
    <div
      ref={sceneContainerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        visibility: "visible",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        color: "white",
        backgroundColor: "red",
      }}
    >
      <span style={{ fontSize: 20 }}>Loading...</span>
    </div>
  );
};

export default Loading;
