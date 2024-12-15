// src/components/SpineManager.jsx
import { gsap } from "gsap";
import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef } from "react";
import { useCombatManager } from "../service/CombatManager";
import { calculatePerspective, hexToPixel } from "../utils/hexUtil";

declare module "pixi-spine" {
  interface Spine {
    isMoving?: boolean;
  }
}

const SpineStage = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { characters, hexCell } = useCombatManager();

  const spineCharactersRef = useRef<Record<string, Spine>>({});
  const graphicsRef = useRef<PIXI.Graphics | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { clientWidth, clientHeight } = canvasRef.current;
    const app = new PIXI.Application({
      width: clientWidth,
      height: clientHeight,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundColor: 0x00000000,
      backgroundAlpha: 0,
      antialias: true
    });
    appRef.current = app;

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view as unknown as Node);
    }

    const graphics = new PIXI.Graphics();
    app.stage.addChild(graphics);
    graphicsRef.current = graphics;

    return () => {
      app.destroy(true, true);
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !characters) return;

    characters.forEach((character) => {
      if (!spineCharactersRef.current[character.character_id]) {
        (async () => {
          try {
            const spineData = await PIXI.Assets.load(character.asset);
            const spineCharacter = new Spine(spineData.spineData);

            // 计算基础缩放
            const bounds = spineCharacter.getBounds();
            const baseScale = (hexCell.width * 0.9) / bounds.width;

            // 应用透视效果
            const { scale, skewX } = calculatePerspective(
              character.r,  // 当前行号
              7,           // 总行数
              baseScale,   // 基础缩放
              1200,        // 透视强度
              45          // X轴旋转角度
            );

            // 设置位置和缩放
            const { width, height } = hexCell;
            const { x, y } = hexToPixel(character.q, character.r, width, height);
            spineCharacter.position.set(x, y);
            spineCharacter.scale.set(scale);
            spineCharacter.skew.x = skewX;

            app.stage.addChild(spineCharacter);
            spineCharacter.state.setAnimation(0, "idle", true);

            spineCharactersRef.current[character.character_id] = spineCharacter;
          } catch (error) {
            console.error(`Failed to load Spine animation for character ${character.character_id}:`, error);
          }
        })();
      }
    });

    Object.keys(spineCharactersRef.current).forEach((id) => {
      if (!characters.find((c) => c.character_id === id)) {
        const spineCharacter = spineCharactersRef.current[id];
        if (spineCharacter) {
          app.stage.removeChild(spineCharacter);
          spineCharacter.destroy();
          delete spineCharactersRef.current[id];
        }
      }
    });
  }, [characters]);

  // 监听窗口大小变化，调整 Pixi.js 应用尺寸
  useEffect(() => {
    const handleResize = () => {
      const app = appRef.current;
      const container = canvasRef.current;
      if (!app || !container || !characters) return;

      // 使用父容器的尺寸
      const { clientWidth, clientHeight } = container;
      app.renderer.resize(clientWidth, clientHeight);

      // 根据新尺寸重新计算角色位置
      characters.forEach((character) => {
        const spineCharacter = spineCharactersRef.current[character.character_id];
        if (spineCharacter) {
          const { x, y } = hexToPixel(character.q, character.r, hexCell.width, hexCell.height);
          gsap.to(spineCharacter.position, {
            x: x,
            y: y,
            duration: 0.5,
            ease: "power1.inOut",
          });
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [characters, hexCell]);

  return (
    <div
      ref={canvasRef}
      style={{
        position: "absolute",
        zIndex: 10000,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        transform: "rotateX(45deg)",
        transformOrigin: "center center",
        overflow: "hidden"
      }}
    />
  );
};

export default SpineStage;
