import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef } from "react";

const SpineAnimation = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x1099bb,
    });

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view as HTMLCanvasElement);
    }

    (async () => {
      try {
        const spineData = await PIXI.Assets.load("path/to/spine/file.json");
        const spineCharacter = new Spine(spineData.spineData);

        spineCharacter.x = app.screen.width / 2;
        spineCharacter.y = app.screen.height / 1.5;
        spineCharacter.scale.set(0.5);

        app.stage.addChild(spineCharacter);

        spineCharacter.state.setAnimation(0, "animationName", true);
      } catch (error) {
        console.error("Failed to load Spine animation:", error);
      }
    })();

    return () => {
      app.destroy(true, true);
    };
  }, []);

  return <div ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export default SpineAnimation;
