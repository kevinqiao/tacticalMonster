import { gsap } from "gsap";
import React, { useEffect, useRef, useState } from "react";
import { SCENE_NAME } from "../../model/Match3Constants";
import { useSceneManager } from "../../service/SceneManager";
import useDimension from "../../util/useDimension";

const BattleLoading = ({ battle }: { battle: any }) => {
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const foundRef = useRef<HTMLDivElement | null>(null);
  const vsRef = useRef<HTMLDivElement | null>(null);
  const playerAvatarRef = useRef<HTMLDivElement | null>(null);
  const opponentAvatarRef = useRef<HTMLDivElement | null>(null);
  const { scenes } = useSceneManager();
  const { width, height } = useDimension(sceneContainerRef);

  const [searchComplete, setSearchComplete] = useState(false);

  useEffect(() => {
    const ml = gsap.timeline({
      onComplete: () => {
        console.log("complete search");
        setSearchComplete(true);
        ml.kill();
      },
    });
    const bl = gsap.timeline({
      onComplete: () => {
        bl.kill();
      },
    });
    bl.to(sceneContainerRef.current, { autoAlpha: 1, duration: 0 });
    const tl = gsap.timeline({
      repeat: 4,
      yoyo: true,
      onComplete: () => {
        tl.kill();
      },
    });
    tl.fromTo(
      searchRef.current,
      { scaleX: 0.9, scaleY: 0.9 },
      { duration: 0.5, scaleX: 1.1, scaleY: 1.1, ease: "power2.inOut" }
    );
    ml.add(bl).add(tl);
    ml.play();
  }, []);

  useEffect(() => {
    if (battle && searchComplete) {
      const tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
      tl.to(searchRef.current, { alpha: 0, duration: 0.1 });
      tl.to(foundRef.current, { alpha: 1, duration: 0.1 }, "<");
      tl.fromTo(vsRef.current, { scaleX: 0, scaleY: 0 }, { scaleX: 1.4, scaleY: 1.4, duration: 0.6 }, ">");
      tl.to(vsRef.current, { alpha: 1, duration: 0.8 }, "<");
      tl.to(playerAvatarRef.current, { duration: 1.2, alpha: 1, x: width * 0.35 }, "<");
      tl.to(opponentAvatarRef.current, { duration: 1.2, alpha: 1, x: -width * 0.35 }, "<");
      tl.play();
    }
  }, [searchComplete, battle]);

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
          searchTxTEle: searchRef.current,
          vsEle: vsRef.current,
          foundTxTEle: foundRef.current,
          playerAvatarEle: playerAvatarRef.current,
          opponentAvatarEle: opponentAvatarRef.current,
        };
        // stageScene(SCENE_NAME.BATTLE_MATCHING, scene);
      }
    }
    return () => {
      if (scenes) scenes.delete(SCENE_NAME.BATTLE_MATCHING);
    };
  }, [sceneContainerRef, searchRef, vsRef, foundRef, scenes, width, height]);

  return (
    <div
      ref={sceneContainerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        color: "white",
        opacity: 0,
        backgroundColor: "red",
        pointerEvents: "none",
      }}
    >
      <div
        ref={playerAvatarRef}
        style={{
          opacity: 0,
          position: "absolute",
          top: height * 0.4,
          left: -80,
          width: 80,
          height: 80,
        }}
      >
        {/* <Avatar player={null} /> */}
      </div>
      <div
        ref={opponentAvatarRef}
        style={{
          opacity: 0,
          position: "absolute",
          top: height * 0.4,
          left: width,
          width: 80,
          height: 80,
        }}
      >
        {/* <Avatar /> */}
      </div>
      <div
        ref={vsRef}
        style={{
          opacity: 0,
          position: "absolute",
          top: height * 0.4 + 40,
          left: 0,
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <span style={{ fontSize: 20 }}>VS</span>
      </div>
      <div
        ref={searchRef}
        style={{
          position: "absolute",
          top: height * 0.6,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 20 }}>Searching...</span>
      </div>
      <div
        ref={foundRef}
        style={{
          opacity: 0,
          position: "absolute",
          top: height * 0.7,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 20 }}>Opponent Found</span>
      </div>
    </div>
  );
};

export default BattleLoading;
